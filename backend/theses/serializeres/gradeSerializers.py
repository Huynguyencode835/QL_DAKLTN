from theses.views import registration_period
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from rest_framework import serializers

from theses.models import Committee, ReviewerAssignmentSession, CommitteeMember, Grade, GradeWeightConfig, PeriodicReportSchedule, ProjectRegistration, Report, RegistrationLecturer
from theses.email_utils import send_notification_email


class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grade
        fields = [
            'id',
            'registration',
            'grade_type',
            'component',
            'graded_by_lecturer',
            'graded_by_committee_member',
            'is_final',
            'score',
            'comment',
            'graded_at',
            'created_date',
            'updated_date',
        ]
        read_only_fields = ['graded_at', 'created_date', 'updated_date', 'graded_by_lecturer','graded_by_committee_member']

    def _get(self, attrs, field):
        if field in attrs:
            return attrs[field]
        return getattr(self.instance, field, None)

    def _resolve_committee_member(self, registration):
        """Tìm CommitteeMember tương ứng request.user trong hội đồng đang phụ trách registration.
        Raise lỗi rõ ràng nếu chưa có hội đồng hoặc user không phải thành viên."""
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        if not registration.committee_id:
            raise serializers.ValidationError({
                'graded_by_committee_member': 'Registration này chưa được gán hội đồng chấm.'
            })

        member = CommitteeMember.objects.filter(
            committee_id=registration.committee_id,
            lecturer=user,
        ).first()

        if member is None:
            raise serializers.ValidationError({
                'graded_by_committee_member': 'Bạn không phải thành viên hội đồng đang phụ trách registration này.'
            })

        return member


    def validate(self, attrs):
        grade_type = self._get(attrs, 'grade_type')
        component = self._get(attrs, 'component')
        registration = self._get(attrs, 'registration')
        graded_by_lecturer = getattr(self.context.get('view'), '_registration_lecturer', None)

        if graded_by_lecturer is None and grade_type in (Grade.GradeType.SUPERVISOR, Grade.GradeType.REVIEWER):
            user = self.context['request'].user
            expected_role = (
                RegistrationLecturer.Role.MAIN if grade_type == Grade.GradeType.SUPERVISOR
                else RegistrationLecturer.Role.REVIEWER
            )
            graded_by_lecturer = RegistrationLecturer.objects.filter(
                registration=registration, lecturer=user, role=expected_role,
                approval_status=RegistrationLecturer.ApprovalStatus.APPROVED,
            ).first()
            if graded_by_lecturer:
                self.context['view']._registration_lecturer = graded_by_lecturer

        if grade_type == Grade.GradeType.COMMITTEE:
            graded_by_committee_member = self._resolve_committee_member(registration)
            self._resolved_committee_member = graded_by_committee_member

        if grade_type == Grade.GradeType.REVIEWER and not registration.is_thesis:
            raise serializers.ValidationError({
                'grade_type': 'Đồ án (chưa lên khóa luận) không có điểm phản biện.'
            })

        if grade_type == Grade.GradeType.COMMITTEE:
            committee = registration.committee
            if not committee:
                raise serializers.ValidationError({
                    'grade_type': 'Registration này chưa được gán hội đồng.'
                })
            if committee.status != Committee.CommitteeStatus.IN_PROGRESS:
                raise serializers.ValidationError({
                    'grade_type': f'Chỉ có thể chấm điểm khi hội đồng đang diễn ra. Trạng thái hiện tại: {committee.get_status_display()}.'
                })

        if grade_type == Grade.GradeType.REVIEWER:
            lecturer = RegistrationLecturer.objects.filter(
                lecturer = self.context['request'].user,
                role = RegistrationLecturer.Role.REVIEWER,
                registration=registration
            ).first()

            if not lecturer:
                raise serializers.ValidationError({
                    'grade_type': 'Bạn không phải giản viên phản biện của đề tài hiện tại.'
                })

            reviewer_session = lecturer.reviewer_session

            if reviewer_session is None:
                raise serializers.ValidationError({
                    'grade_type': 'Bạn chưa được phân công ngày phản biện'
                })
            today = timezone.localdate()
            defense_day = timezone.localtime(reviewer_session.defense_date).date()
            if today != defense_day:
                raise serializers.ValidationError({
                    'grade_type': f'Chỉ có thể chấm phản biện vào ngày bảo vệ ({defense_day.strftime("%d/%m/%Y")}).'
                })

        if grade_type == Grade.GradeType.SUPERVISOR:
            if component == Grade.Component.PROCESS:
                report_schedules = PeriodicReportSchedule.objects.filter(
                    registrations=registration,
                    lecturer=graded_by_lecturer.lecturer,
                )

                submitted_schedule_ids = Report.objects.filter(
                    registration=registration,
                    report_type=Report.ReportType.PERIODIC,
                    schedule__in=report_schedules,
                ).values_list('schedule_id', flat=True)

                missing_schedules = report_schedules.exclude(id__in=submitted_schedule_ids)

                if missing_schedules.exists():
                    missing_titles = ', '.join(
                        s.title or f'Báo cáo lần {s.sequence_number}'
                        for s in missing_schedules.order_by('sequence_number')
                    )
                    raise serializers.ValidationError(
                        f'Sinh viên chưa nộp đủ báo cáo định kỳ. Còn thiếu: {missing_titles}.'
                    )
            if component == Grade.Component.FINAL:
                final_report = Report.objects.filter(
                    registration=registration,
                    report_type=Report.ReportType.FINAL,
                ).exclude(
                    status=Report.Status.REJECTED,
                ).order_by('-sequence_number').first()

                if final_report is None:
                    raise serializers.ValidationError(
                        'Sinh viên chưa nộp báo cáo cuối kỳ.'
                    )

            if component not in (Grade.Component.PROCESS, Grade.Component.FINAL):
                raise serializers.ValidationError({
                    'component': 'SUPERVISOR yêu cầu component là process hoặc final.'
                })
        else:
            if component != Grade.Component.OVERALL:
                raise serializers.ValidationError({
                    'component': f'grade_type={grade_type} chỉ được dùng component=overall.'
                })

        if grade_type in (Grade.GradeType.SUPERVISOR, Grade.GradeType.REVIEWER):
            if graded_by_lecturer.registration_id != registration.id:
                raise serializers.ValidationError({
                    'graded_by_lecturer': 'graded_by_lecturer phải thuộc đúng registration của Grade này.'
                })
            expected_role = (
                RegistrationLecturer.Role.MAIN
                if grade_type == Grade.GradeType.SUPERVISOR
                else RegistrationLecturer.Role.REVIEWER
            )
            if graded_by_lecturer.role != expected_role:
                raise serializers.ValidationError({
                    'graded_by_lecturer': f'grade_type={grade_type} yêu cầu graded_by_lecturer có role={expected_role}.'
                })

            # Điểm process/final của cùng 1 SUPERVISOR phải do cùng 1 GVHD chấm
            if grade_type == Grade.GradeType.SUPERVISOR:
                sibling_qs = Grade.objects.filter(
                    registration=registration, grade_type=Grade.GradeType.SUPERVISOR,
                )
                if self.instance is not None:
                    sibling_qs = sibling_qs.exclude(pk=self.instance.pk)
                sibling = sibling_qs.first()
                if sibling and sibling.graded_by_lecturer_id != graded_by_lecturer.id:
                    raise serializers.ValidationError(
                        'Điểm quá trình và cuối kỳ của SUPERVISOR phải do cùng 1 GVHD chấm.'
                    )

        return attrs

    def create(self, validated_data):
        grade_type = validated_data.get('grade_type')

        if grade_type in (Grade.GradeType.SUPERVISOR, Grade.GradeType.REVIEWER):
            rl = getattr(self.context.get('view'), '_registration_lecturer', None)
            if rl:
                validated_data['graded_by_lecturer'] = rl

        if grade_type == Grade.GradeType.COMMITTEE:
            if getattr(self, '_resolved_committee_member', None):
                validated_data['graded_by_committee_member'] = self._resolved_committee_member

        instance = super().create(validated_data)
        self._on_grade_saved(instance)
        return instance

    def update(self, instance, validated_data):
        grade_type = validated_data.get('grade_type', instance.grade_type)

        if grade_type in (Grade.GradeType.SUPERVISOR, Grade.GradeType.REVIEWER):
            rl = getattr(self.context.get('view'), '_registration_lecturer', None)
            if rl:
                validated_data['graded_by_lecturer'] = rl

        if grade_type == Grade.GradeType.COMMITTEE:
            if getattr(self, '_resolved_committee_member', None):
                validated_data['graded_by_committee_member'] = self._resolved_committee_member

        instance = super().update(instance, validated_data)
        self._on_grade_saved(instance)
        return instance

    def _on_grade_saved(self, grade):
        if grade.grade_type == Grade.GradeType.COMMITTEE and not grade.is_final:
            self._try_aggregate_committee_grade(grade.registration)
        self._recalculate_final_score(grade.registration)

        grade_type_display = dict(Grade.GradeType.choices).get(grade.grade_type, grade.grade_type)
        grader_name = ''
        if grade.graded_by_lecturer:
            grader_name = grade.graded_by_lecturer.lecturer.get_full_name() or grade.graded_by_lecturer.lecturer.username
        elif grade.graded_by_committee_member:
            grader_name = grade.graded_by_committee_member.lecturer.get_full_name() or grade.graded_by_committee_member.lecturer.username

        send_notification_email(
            'info_notification',
            'Điểm đã được cập nhật',
            [grade.registration.student.email],
            {
                'title': 'Điểm đã được cập nhật',
                'student_name': grade.registration.student.get_full_name() or grade.registration.student.username,
                'message': f'{grader_name} đã chấm điểm {grade_type_display} cho đề tài "{grade.registration.project_title}".',
                'details': [
                    ('Đề tài', grade.registration.project_title),
                    ('Loại điểm', grade_type_display),
                    ('Điểm', str(grade.score)),
                ],
                'action_url': f'{settings.FRONTEND_URL}/grades-and-results',
                'action_label': 'Xem điểm',
            },
        )

    def _try_aggregate_committee_grade(self, registration):
        committee = registration.committee
        if committee is None:
            return

        member_count = committee.members.count()
        individual_grades = list(
            Grade.objects.filter(
                registration=registration,
                grade_type=Grade.GradeType.COMMITTEE,
                is_final=False,
            )
        )

        if member_count == 0 or len(individual_grades) < member_count:
            Grade.objects.filter(
                registration=registration,
                grade_type=Grade.GradeType.COMMITTEE,
                is_final=True,
                graded_by_committee_member__isnull=True,
                graded_by_lecturer__isnull=True,
            ).delete()
            return

        avg_score = round(sum(g.score for g in individual_grades) / len(individual_grades), 2)

        with transaction.atomic():
            Grade.objects.update_or_create(
                registration=registration,
                grade_type=Grade.GradeType.COMMITTEE,
                component=Grade.Component.OVERALL,
                graded_by_committee_member=None,
                graded_by_lecturer=None,
                defaults={'is_final': True, 'score': avg_score},
            )

    def _get_grade_weight(self, registration_period, scope, component):
        config = GradeWeightConfig.objects.filter(
            registration_period=registration_period, scope=scope, component=component,
        ).first()
        if config is None:
            raise serializers.ValidationError(
                f'Thiếu cấu hình trọng số cho period={registration_period}, '
                f'scope={scope}, component={component}.'
            )
        return config.weight

    def _resolve_grade_scope(self, registration):
        if registration.is_thesis:
            return GradeWeightConfig.Scope.THESIS
        return (
            GradeWeightConfig.Scope.PROJECT_WITH_COMMITTEE
            if registration.committee_id
            else GradeWeightConfig.Scope.PROJECT_NO_COMMITTEE
        )
    
    def _recalculate_final_score(self, registration):
        scope = self._resolve_grade_scope(registration)
        period = registration.registration_period

        grades = list(Grade.objects.filter(registration=registration, is_final=True))

        process = next((g for g in grades if g.grade_type == Grade.GradeType.SUPERVISOR
                            and g.component == Grade.Component.PROCESS), None)
        final = next((g for g in grades if g.grade_type == Grade.GradeType.SUPERVISOR
                        and g.component == Grade.Component.FINAL), None)
        reviewer = next((g for g in grades if g.grade_type == Grade.GradeType.REVIEWER), None)
        committee = next((g for g in grades if g.grade_type == Grade.GradeType.COMMITTEE), None)

        # supervisor luôn bắt buộc ở mọi scope -> cần đủ process + final
        if not (process and final):
            registration.final_score = None
            registration.save(update_fields=['final_score'])
            return

        process_w = self._get_grade_weight(period, GradeWeightConfig.Scope.COMMON, Grade.Component.PROCESS)
        final_w = self._get_grade_weight(period, GradeWeightConfig.Scope.COMMON, Grade.Component.FINAL)
        supervisor_score = process.score * process_w + final.score * final_w

        component_scores = {'supervisor': supervisor_score}
        needed_components = ['supervisor']

        if scope == GradeWeightConfig.Scope.THESIS:
            needed_components += ['reviewer', 'committee']
            if not reviewer or not committee:
                registration.final_score = None
                registration.save(update_fields=['final_score'])
                return
            component_scores['reviewer'] = reviewer.score
            component_scores['committee'] = committee.score

        elif scope == GradeWeightConfig.Scope.PROJECT_WITH_COMMITTEE:
            needed_components += ['committee']
            if not committee:
                registration.final_score = None
                registration.save(update_fields=['final_score'])
                return
            component_scores['committee'] = committee.score

        # PROJECT_NO_COMMITTEE: chỉ cần supervisor, không cần thêm gì.

        weights = {
            comp: self._get_grade_weight(period, scope, comp) for comp in needed_components
        }
        total_weight = sum(weights.values())
        total_weighted = sum(component_scores[c] * weights[c] for c in needed_components)

        registration.final_score = round(total_weighted / total_weight, 2) if total_weight else None
        registration.save(update_fields=['final_score'])


class GradeListSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    student_name = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()
    project_title = serializers.CharField()
    is_thesis = serializers.SerializerMethodField()
    wants_thesis_upgrade = serializers.SerializerMethodField()
    process = serializers.SerializerMethodField()
    reviewer = serializers.SerializerMethodField()
    committee = serializers.SerializerMethodField()
    avg = serializers.DecimalField(source='final_score', max_digits=4, decimal_places=2, allow_null=True)
    supervisor_final = serializers.SerializerMethodField()
    process_grade_id = serializers.SerializerMethodField()
    final_grade_id = serializers.SerializerMethodField()

    def _find_score(self, obj, grade_type, component):
        for grade in obj.grades.all():
            if grade.grade_type == grade_type and grade.component == component and grade.is_final:
                return grade.score
        return None

    def _find_grade_id(self, obj, grade_type, component):
        for grade in obj.grades.all():
            if grade.grade_type == grade_type and grade.component == component:
                return grade.id
        return None

    def get_student_name(self, obj):
        user = obj.student
        return user.get_full_name() or user.username

    def get_is_thesis(self, obj):
        return obj.is_thesis

    def get_wants_thesis_upgrade(self, obj):
        return obj.wants_thesis_upgrade

    def get_student_id(self, obj):
        profile = getattr(obj.student, 'student_profile', None)
        return profile.student_id if profile else None

    def get_process(self, obj):
        return self._find_score(obj, Grade.GradeType.SUPERVISOR, Grade.Component.PROCESS)

    def get_reviewer(self, obj):
        return self._find_score(obj, Grade.GradeType.REVIEWER, Grade.Component.OVERALL)

    def get_committee(self, obj):
        # Hội đồng có nhiều thành viên chấm riêng lẻ -> trả về điểm trung bình
        # của các bản ghi COMMITTEE đã có điểm, thay vì lấy đại 1 bản ghi.
        scores = [
            grade.score
            for grade in obj.grades.all()
            if grade.grade_type == Grade.GradeType.COMMITTEE and grade.score is not None
        ]
        if not scores:
            return None
        return round(sum(scores) / len(scores), 2)

    def get_supervisor_final(self, obj):
        return self._find_score(obj, Grade.GradeType.SUPERVISOR, Grade.Component.FINAL)

    def get_process_grade_id(self, obj):
        return self._find_grade_id(obj, Grade.GradeType.SUPERVISOR, Grade.Component.PROCESS)

    def get_final_grade_id(self, obj):
        return self._find_grade_id(obj, Grade.GradeType.SUPERVISOR, Grade.Component.FINAL)


class CommitteeMemberGradeSerializer(serializers.ModelSerializer):
    member_id = serializers.IntegerField(source='graded_by_committee_member_id', read_only=True)
    lecturer_id = serializers.IntegerField(source='graded_by_committee_member.lecturer_id', read_only=True)
    member_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = Grade
        fields = [
            'id',
            'member_id',
            'lecturer_id',
            'member_name',
            'role',
            'score',
            'comment',
            'is_final',
            'graded_at',
        ]

    def get_member_name(self, obj):
        member = obj.graded_by_committee_member
        if not member or not getattr(member, 'lecturer', None):
            return None
        lecturer = member.lecturer
        return lecturer.get_full_name() or lecturer.username

    def get_role(self, obj):
        member = obj.graded_by_committee_member
        return getattr(member, 'role', None)


class RegistrationGradesSerializer(serializers.Serializer):
    registration = serializers.IntegerField()
    process = serializers.SerializerMethodField()
    final = serializers.SerializerMethodField()
    reviewer = serializers.SerializerMethodField()
    committee_members = serializers.SerializerMethodField()
    committee_avg = serializers.SerializerMethodField()
    supervisor_final = serializers.SerializerMethodField()
    final_score = serializers.SerializerMethodField()

    def _single(self, grades, grade_type, component):
        grade = next(
            (g for g in grades if g.grade_type == grade_type and g.component == component),
            None,
        )
        if grade is None:
            return None
        return GradeSerializer(grade, context=self.context).data

    def _find_grade(self, grades, grade_type, component):
        return next(
            (g for g in grades if g.grade_type == grade_type and g.component == component and g.is_final),
            None,
        )

    def _get_grade_weight(self, registration_period, scope, component):
        config = GradeWeightConfig.objects.filter(
            registration_period=registration_period, scope=scope, component=component,
        ).first()
        if config is None:
            return None
        return config.weight

    def get_supervisor_final(self, obj):
        grades = obj['grades']
        process = self._find_grade(grades, Grade.GradeType.SUPERVISOR, Grade.Component.PROCESS)
        final = self._find_grade(grades, Grade.GradeType.SUPERVISOR, Grade.Component.FINAL)

        if not (process and final):
            return None

        registration_id = obj.get('registration')
        registration = ProjectRegistration.objects.select_related('registration_period').get(id=registration_id)
        period = registration.registration_period

        process_w = self._get_grade_weight(period, GradeWeightConfig.Scope.COMMON, Grade.Component.PROCESS)
        final_w = self._get_grade_weight(period, GradeWeightConfig.Scope.COMMON, Grade.Component.FINAL)

        if process_w is None or final_w is None:
            return None

        return round(process.score * process_w + final.score * final_w, 2)

    def get_process(self, obj):
        return self._single(obj['grades'], Grade.GradeType.SUPERVISOR, Grade.Component.PROCESS)

    def get_final(self, obj):
        return self._single(obj['grades'], Grade.GradeType.SUPERVISOR, Grade.Component.FINAL)

    def get_reviewer(self, obj):
        return self._single(obj['grades'], Grade.GradeType.REVIEWER, Grade.Component.OVERALL)

    def get_committee_members(self, obj):
        committee_grades = [g for g in obj['grades'] if g.grade_type == Grade.GradeType.COMMITTEE]
        return CommitteeMemberGradeSerializer(committee_grades, many=True, context=self.context).data

    def get_final_score(self, obj):
        return obj.get('final_score', None)

    def get_committee_avg(self, obj):
        scores = [
            g.score
            for g in obj['grades']
            if g.grade_type == Grade.GradeType.COMMITTEE and g.score is not None
        ]
        if not scores:
            return None
        return round(sum(scores) / len(scores), 2)