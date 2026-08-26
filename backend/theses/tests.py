import threading

from django.contrib.auth import get_user_model
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient

from theses.models import (
    Faculty, Major, StudentProfile, AcademicDegree, LecturerProfile,
    RegistrationPeriod, ProjectRegistration, RegistrationLecturer,
)

User = get_user_model()


class RegistrationApprovalBase(APITestCase):
    def setUp(self):
        self.faculty = Faculty.objects.create(name='Khoa CNTT')
        self.major = Major.objects.create(
            faculty=self.faculty, major_name='CNTT', training_duration=4,
        )
        self.staff = self._make_user('staff1', User.Role.STAFF)
        self.student = self._make_user('student1', User.Role.STUDENT)
        StudentProfile.objects.create(
            user=self.student, student_id='SV001', class_name='CNTT1',
            academic_year='2023', major=self.major,
        )
        self.degree = AcademicDegree.objects.create(
            name=AcademicDegree.DegreeName.MASTER, max_students_quota=3,
        )
        self.lecturers = [self._make_lecturer(f'lec{i}') for i in range(1, 4)]
        self.period = RegistrationPeriod.objects.create(
            name='Đợt 1', academic_year='2025',
            student_registration_start=timezone.now() - timezone.timedelta(days=1),
            status=RegistrationPeriod.STATUS.STUDENT_REGISTRATION,
            faculty=self.faculty,
            created_by=self.staff,
        )
        self.registration = ProjectRegistration.objects.create(
            student=self.student,
            registration_period=self.period,
            project_title='Đồ án X',
            project_description='Mô tả đồ án',
        )

    def _make_user(self, username, role):
        return User.objects.create_user(
            username=username, password='pass123', role=role, faculty=self.faculty,
        )

    def _make_lecturer(self, username):
        user = self._make_user(username, User.Role.LECTURER)
        LecturerProfile.objects.create(user=user, academic_degree=self.degree)
        return user

    def _add_preference(self, lecturer, priority, status=None, note=''):
        if status is None:
            status = RegistrationLecturer.ApprovalStatus.PENDING
        return RegistrationLecturer.objects.create(
            registration=self.registration,
            lecturer=lecturer,
            role=RegistrationLecturer.Role.PREFERENCE,
            priority=priority,
            approval_status=status,
            note=note,
        )

    def _approve(self, lecturer, **data):
        client = APIClient()
        client.force_authenticate(user=lecturer)
        url = (
            f'/api/registration-periods/{self.period.pk}/registrations/'
            f'{self.registration.pk}/approve/'
        )
        return client.patch(url, data or {}, format='json')

    def _reject(self, lecturer, **data):
        client = APIClient()
        client.force_authenticate(user=lecturer)
        url = (
            f'/api/registration-periods/{self.period.pk}/registrations/'
            f'{self.registration.pk}/reject/'
        )
        return client.patch(url, data or {}, format='json')

    def _make_full_lecturer(self):
        degree = AcademicDegree.objects.create(
            name=AcademicDegree.DegreeName.DOCTOR, max_students_quota=1,
        )
        lecturer = self._make_user('lec_full', User.Role.LECTURER)
        LecturerProfile.objects.create(user=lecturer, academic_degree=degree)

        student2 = self._make_user('student2', User.Role.STUDENT)
        StudentProfile.objects.create(
            user=student2, student_id='SV002', class_name='CNTT1',
            academic_year='2023', major=self.major,
        )
        other_registration = ProjectRegistration.objects.create(
            student=student2,
            registration_period=self.period,
            project_title='Đồ án Y',
            project_description='Mô tả',
        )
        RegistrationLecturer.objects.create(
            registration=other_registration,
            lecturer=lecturer,
            role=RegistrationLecturer.Role.MAIN,
            approval_status=RegistrationLecturer.ApprovalStatus.APPROVED,
            responded_at=timezone.now(),
        )
        return lecturer


class RegistrationApprovalTests(RegistrationApprovalBase):
    def test_1_single_preference_approve_becomes_main(self):
        a1 = self._add_preference(self.lecturers[0], 1)
        resp = self._approve(self.lecturers[0])
        self.assertEqual(resp.status_code, 200)
        a1.refresh_from_db()
        self.assertEqual(a1.role, RegistrationLecturer.Role.MAIN)
        self.assertEqual(a1.approval_status, RegistrationLecturer.ApprovalStatus.APPROVED)
        self.assertIsNotNone(a1.responded_at)
        self.registration.refresh_from_db()
        self.assertEqual(
            self.registration.status,
            ProjectRegistration.STATUS.ASSIGNED_LECTURER_AND_PENDING,
        )

    def test_2_approve_top_priority_skips_remaining(self):
        a1 = self._add_preference(self.lecturers[0], 1)
        a2 = self._add_preference(self.lecturers[1], 2)
        a3 = self._add_preference(self.lecturers[2], 3)
        resp = self._approve(self.lecturers[0])
        self.assertEqual(resp.status_code, 200)
        a1.refresh_from_db()
        a2.refresh_from_db()
        a3.refresh_from_db()
        self.assertEqual(a1.role, RegistrationLecturer.Role.MAIN)
        self.assertEqual(a2.approval_status, RegistrationLecturer.ApprovalStatus.SKIPPED)
        self.assertEqual(a3.approval_status, RegistrationLecturer.ApprovalStatus.SKIPPED)
        self.registration.refresh_from_db()
        self.assertEqual(
            self.registration.status,
            ProjectRegistration.STATUS.ASSIGNED_LECTURER_AND_PENDING,
        )

    def test_3_top_rejected_then_second_approved_becomes_main(self):
        a1 = self._add_preference(self.lecturers[0], 1)
        a2 = self._add_preference(self.lecturers[1], 2)
        a3 = self._add_preference(self.lecturers[2], 3)
        self._reject(self.lecturers[0], note='không nhận')
        a1.refresh_from_db()
        self.assertEqual(a1.approval_status, RegistrationLecturer.ApprovalStatus.REJECTED)

        resp = self._approve(self.lecturers[1])
        self.assertEqual(resp.status_code, 200)
        a2.refresh_from_db()
        a3.refresh_from_db()
        self.assertEqual(a2.role, RegistrationLecturer.Role.MAIN)
        self.assertEqual(a2.approval_status, RegistrationLecturer.ApprovalStatus.APPROVED)
        self.assertEqual(a3.approval_status, RegistrationLecturer.ApprovalStatus.SKIPPED)
        self.registration.refresh_from_db()
        self.assertEqual(
            self.registration.status,
            ProjectRegistration.STATUS.ASSIGNED_LECTURER_AND_PENDING,
        )

    def test_4_top_rejected_second_pending_no_main(self):
        a1 = self._add_preference(self.lecturers[0], 1)
        a2 = self._add_preference(self.lecturers[1], 2)
        self._reject(self.lecturers[0], note='không nhận')
        a2.refresh_from_db()
        self.assertEqual(a2.role, RegistrationLecturer.Role.PREFERENCE)
        self.assertEqual(a2.approval_status, RegistrationLecturer.ApprovalStatus.PENDING)
        self.assertEqual(
            RegistrationLecturer.objects.filter(role=RegistrationLecturer.Role.MAIN).count(),
            0,
        )
        self.registration.refresh_from_db()
        self.assertEqual(
            self.registration.status,
            ProjectRegistration.STATUS.WAITING_LECTURER_AND_PENDING,
        )

    def test_5_all_rejected_goes_waiting_staff_assignment(self):
        a1 = self._add_preference(self.lecturers[0], 1)
        a2 = self._add_preference(self.lecturers[1], 2)
        self._reject(self.lecturers[0], note='không nhận')
        self._reject(self.lecturers[1], note='không nhận')
        self.registration.refresh_from_db()
        self.assertEqual(
            self.registration.status,
            ProjectRegistration.STATUS.WAITING_STAFF_ASSIGNMENT,
        )

        client = APIClient()
        client.force_authenticate(user=self.staff)
        url = (
            f'/api/registration-periods/{self.period.pk}/registrations/'
            f'?status={ProjectRegistration.STATUS.WAITING_STAFF_ASSIGNMENT}'
        )
        resp = client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertIn(self.registration.pk, [item['id'] for item in resp.data])

    def test_6_double_approve_returns_400_no_data_change(self):
        a1 = self._add_preference(self.lecturers[0], 1)
        resp1 = self._approve(self.lecturers[0])
        self.assertEqual(resp1.status_code, 200)
        a1.refresh_from_db()
        responded_at_before = a1.responded_at

        resp2 = self._approve(self.lecturers[0])
        self.assertEqual(resp2.status_code, 400)

        a1.refresh_from_db()
        self.assertEqual(a1.responded_at, responded_at_before)
        self.assertEqual(a1.role, RegistrationLecturer.Role.MAIN)
        self.assertEqual(
            RegistrationLecturer.objects.filter(role=RegistrationLecturer.Role.MAIN).count(),
            1,
        )

    def test_8_approve_lower_priority_after_top_approved_skipped(self):
        a1 = self._add_preference(self.lecturers[0], 1)
        a2 = self._add_preference(self.lecturers[1], 2)
        self._approve(self.lecturers[0])
        a2.refresh_from_db()
        self.assertEqual(a2.approval_status, RegistrationLecturer.ApprovalStatus.SKIPPED)

        resp2 = self._approve(self.lecturers[1])
        self.assertEqual(resp2.status_code, 400)

        mains = RegistrationLecturer.objects.filter(role=RegistrationLecturer.Role.MAIN)
        self.assertEqual(mains.count(), 1)
        self.assertEqual(mains.first().id, a1.id)

    def test_approve_blocked_when_lecturer_full(self):
        lecturer = self._make_full_lecturer()
        pref = self._add_preference(lecturer, 1)
        resp = self._approve(lecturer)
        self.assertEqual(resp.status_code, 400)

        pref.refresh_from_db()
        self.assertEqual(pref.approval_status, RegistrationLecturer.ApprovalStatus.PENDING)
        self.assertEqual(pref.role, RegistrationLecturer.Role.PREFERENCE)
        self.assertEqual(
            RegistrationLecturer.objects.filter(role=RegistrationLecturer.Role.MAIN).count(),
            1,
        )
        self.registration.refresh_from_db()
        self.assertEqual(
            self.registration.status,
            ProjectRegistration.STATUS.WAITING_LECTURER_AND_PENDING,
        )

    def test_create_with_advisors_requires_wants_thesis_upgrade(self):
        new_student = self._make_user('student_new', User.Role.STUDENT)
        StudentProfile.objects.create(
            user=new_student, student_id='SV003', class_name='CNTT1',
            academic_year='2023', major=self.major,
        )
        url = f'/api/registration-periods/{self.period.pk}/registrations/'

        client = APIClient()
        client.force_authenticate(user=new_student)
        resp = client.post(url, {
            'project_title': 'Đồ án Z',
            'project_description': 'Mô tả',
            'wants_thesis_upgrade': False,
            'advisor1': self.lecturers[0].pk,
        }, format='json')
        self.assertEqual(resp.status_code, 400)

        resp = client.post(url, {
            'project_title': 'Đồ án Z',
            'project_description': 'Mô tả',
            'wants_thesis_upgrade': True,
            'advisor1': self.lecturers[0].pk,
            'advisor2': self.lecturers[1].pk,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        created = ProjectRegistration.objects.get(
            student=new_student, registration_period=self.period, active=True,
        )
        prefs = RegistrationLecturer.objects.filter(
            registration=created, role=RegistrationLecturer.Role.PREFERENCE,
        ).order_by('priority')
        self.assertEqual(prefs.count(), 2)
        self.assertEqual(prefs[0].priority, 1)
        self.assertEqual(prefs[0].lecturer_id, self.lecturers[0].pk)
        self.assertEqual(prefs[1].priority, 2)
        self.assertEqual(prefs[1].lecturer_id, self.lecturers[1].pk)

    def test_add_lecturer_blocked_when_lecturer_full(self):
        lecturer = self._make_full_lecturer()
        client = APIClient()
        client.force_authenticate(user=self.staff)
        url = (
            f'/api/registration-periods/{self.period.pk}/registrations/'
            f'{self.registration.pk}/add_lecturer/'
        )
        resp = client.patch(url, {'lecturer_id': lecturer.pk}, format='json')
        self.assertEqual(resp.status_code, 400)

        self.assertFalse(
            RegistrationLecturer.objects.filter(
                registration=self.registration, lecturer=lecturer,
            ).exists()
        )
        self.registration.refresh_from_db()
        self.assertEqual(
            self.registration.status,
            ProjectRegistration.STATUS.WAITING_LECTURER_AND_PENDING,
        )


class ConcurrentApprovalTest(TransactionTestCase):
    def test_7_concurrent_approves_leave_exactly_one_main(self):
        faculty = Faculty.objects.create(name='Khoa CNTT')
        User.objects.create_user(username='staff1', password='x', role=User.Role.STAFF, faculty=faculty)
        student = User.objects.create_user(username='stu1', password='x', role=User.Role.STUDENT, faculty=faculty)
        major = Major.objects.create(
            faculty=faculty, major_name='CNTT', training_duration=4,
        )
        StudentProfile.objects.create(
            user=student, student_id='SV001', class_name='CNTT1',
            academic_year='2023', major=major,
        )
        degree = AcademicDegree.objects.create(
            name=AcademicDegree.DegreeName.MASTER, max_students_quota=5,
        )
        lec1 = User.objects.create_user(username='lec1', password='x', role=User.Role.LECTURER, faculty=faculty)
        LecturerProfile.objects.create(user=lec1, academic_degree=degree)
        lec2 = User.objects.create_user(username='lec2', password='x', role=User.Role.LECTURER, faculty=faculty)
        LecturerProfile.objects.create(user=lec2, academic_degree=degree)

        period = RegistrationPeriod.objects.create(
            name='Đợt 1', academic_year='2025',
            student_registration_start=timezone.now() - timezone.timedelta(days=1),
            status=RegistrationPeriod.STATUS.STUDENT_REGISTRATION,
            faculty=faculty,
        )
        reg = ProjectRegistration.objects.create(
            student=student, registration_period=period,
            project_title='T', project_description='D',
        )
        RegistrationLecturer.objects.create(
            registration=reg, lecturer=lec1,
            role=RegistrationLecturer.Role.PREFERENCE, priority=1,
        )
        RegistrationLecturer.objects.create(
            registration=reg, lecturer=lec2,
            role=RegistrationLecturer.Role.PREFERENCE, priority=2,
        )

        url = f'/api/registration-periods/{period.pk}/registrations/{reg.pk}/approve/'
        barrier = threading.Barrier(2)
        lock = threading.Lock()
        status_codes = []

        def approve(lecturer):
            try:
                client = APIClient()
                client.force_authenticate(user=lecturer)
                barrier.wait()
                resp = client.patch(url, {}, format='json')
                with lock:
                    status_codes.append(resp.status_code)
            except Exception as exc:
                with lock:
                    status_codes.append(f'error: {exc}')
            finally:
                from django.db import connection
                connection.close()

        threads = [threading.Thread(target=approve, args=(lec,)) for lec in (lec1, lec2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=30)

        self.assertEqual(len(status_codes), 2)
        for code in status_codes:
            self.assertIsInstance(code, int)
        reg.refresh_from_db()
        mains = RegistrationLecturer.objects.filter(role=RegistrationLecturer.Role.MAIN)
        self.assertEqual(mains.count(), 1)
        self.assertEqual(mains.first().priority, 1)
        self.assertEqual(
            reg.status,
            ProjectRegistration.STATUS.ASSIGNED_LECTURER_AND_PENDING,
        )


class MigrationDataTest(TransactionTestCase):
    def test_9_legacy_option_rows_migrated_to_preference(self):
        target = ('theses', '0002_remove_registrationperiod_unique_open_registration_period_per_faculty_and_more')
        executor = MigrationExecutor(connection)
        executor.migrate([target])

        old_apps = executor.loader.project_state([target]).apps
        OldUser = old_apps.get_model('theses', 'User')
        OldFaculty = old_apps.get_model('theses', 'Faculty')
        OldRegistration = old_apps.get_model('theses', 'ProjectRegistration')
        OldRL = old_apps.get_model('theses', 'RegistrationLecturer')

        faculty = OldFaculty.objects.create(name='Khoa CNTT')
        student = OldUser.objects.create_user(username='stu1', password='x', role='student', faculty=faculty)
        lec1 = OldUser.objects.create_user(username='lec1', password='x', role='lecturer', faculty=faculty)
        lec2 = OldUser.objects.create_user(username='lec2', password='x', role='lecturer', faculty=faculty)
        reg = OldRegistration.objects.create(
            student=student, project_title='T', project_description='D',
        )
        now = timezone.now()
        OldRL.objects.create(
            registration=reg, lecturer=lec1, role='option1',
            approval_status='approved', responded_at=now, note='n1',
        )
        OldRL.objects.create(
            registration=reg, lecturer=lec2, role='option2',
            approval_status='rejected', responded_at=now, note='n2',
        )

        executor.loader.build_graph()
        executor.migrate(executor.loader.graph.leaf_nodes())

        rows = RegistrationLecturer.objects.filter(registration_id=reg.id).order_by('priority')
        self.assertEqual(rows.count(), 2)

        self.assertEqual(rows[0].role, RegistrationLecturer.Role.PREFERENCE)
        self.assertEqual(rows[0].priority, 1)
        self.assertEqual(rows[0].approval_status, RegistrationLecturer.ApprovalStatus.APPROVED)
        self.assertIsNotNone(rows[0].responded_at)
        self.assertEqual(rows[0].note, 'n1')

        self.assertEqual(rows[1].role, RegistrationLecturer.Role.PREFERENCE)
        self.assertEqual(rows[1].priority, 2)
        self.assertEqual(rows[1].approval_status, RegistrationLecturer.ApprovalStatus.REJECTED)
        self.assertIsNotNone(rows[1].responded_at)
        self.assertEqual(rows[1].note, 'n2')
