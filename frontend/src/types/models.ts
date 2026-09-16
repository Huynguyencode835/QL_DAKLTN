export type UserRole = 'student' | 'lecturer' | 'staff' | 'admin';
export type DifficultyLevel = 'easy' | 'medium' | 'difficult';
export type RegistrationStatus = 'waiting_lecturer' | 'assigned_lecturer' | 'waiting_staff_assignment' | 'approved' | 'rejected';

export interface UserProfile {
  student_id?: string;
  class_name?: string;
  gpa?: string;
  major?: { major_name?: string };
  training_type?: string;
  program_type?: string;
  academic_year?: string;
  conduct_score?: number;
  academic_degree?: string;
  specialization?: string;
  specializations?: { id: number; name: string; faculty: number }[];
  position?: string;
}

export interface User {
  id?: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone_number?: string;
  avatar?: string;
  student_id?: string;
  role: UserRole;
  user_type?: UserRole;
  faculty?: { id?: number; name?: string };
  profile?: UserProfile;
  dob?: string;
}

export interface Lecturer {
  id: number;
  full_name: string;
  email: string;
}

export interface RegistrationLecturer {
  id: number;
  registration: number;
  lecturer: number;
  lecturer_name?: string;
  role: 'main' | 'preference' | 'reviewer';
  approval_status: 'pending' | 'approved' | 'rejected' | 'skipped';
  responded_at?: string;
  note?: string;
  created_at?: string;
}

export interface Topic {
  id: number;
  title: string;
  description: string;
  technology?: string;
  difficulty_level?: DifficultyLevel;
}

export interface Registration {
  id: number;
  project_title?: string;
  project_description?: string;
  wants_thesis_upgrade?: boolean;
  status: RegistrationStatus;
  student_name?: string;
  student_id?: string;
  avatar?: string;
  lecturer_name?: string;
  lecturer_assignments?: RegistrationLecturer[];
  student?: {
    id?: number;
    full_name?: string;
    student_id?: string;
  };
  student_info?: {
    full_name?: string;
    student_id?: string;
    email?: string;
    class_name?: string;
    faculty?: string;
    major?: string;
    avatar?: string;
  };
  lecturer_info?: {
    id: number;
    lecturer_id: number;
    full_name: string;
    email?: string;
    role: 'main' | 'preference' | 'reviewer';
    approval_status: 'pending' | 'approved' | 'rejected' | 'skipped';
    note?: string;
    academic_degree?: string;
    specializations?: string[];
  }[];
  status_display?: string;
}

export interface GradeWeightConfig {
  scope: 'common' | 'thesis' | 'project_with_committee' | 'project_no_committee';
  component: 'process' | 'final' | 'supervisor' | 'reviewer' | 'committee';
  weight: number;
}

export interface RegistrationPeriod {
  id: number;
  name: string;
  academic_year: string;
  period_type?: string;
  status?: string;
  active?: boolean;
  created_by?: string;
  created_date?: string;
  updated_date?: string;
  student_registration_start?: string;
  student_registration_end?: string;
  report_submission_start?: string;
  report_submission_end?: string;
  student_registration_days?: number;
  report_submission_days?: number;
  execution_duration_weeks?: number;
  grade_weight_configs?: GradeWeightConfig[];
}

export type PeriodStatus =
  | 'scheduled'
  | 'student_registration'
  | 'in_progress'
  | 'report_submission'
  | 'closed';

export interface Period {
  id: number;
  active: boolean;
  created_date: string;
  updated_date: string;
  name: string;
  academic_year: string;
  status: PeriodStatus;
  student_registration_start: string;
  student_registration_days: number;
  execution_duration_weeks: number;
  report_submission_days: number;
  student_registration_end: string;
  report_submission_start: string;
  report_submission_end: string;
}

export interface Specialization {
  id: number;
  name: string;
  faculty?: { id?: number; name?: string };
}
export type CommitteeStatus = 'not_started' | 'in_progress' | 'completed';
export type CommitteeMemberRole = 'chair' | 'secretary' | 'member' | 'reviewer';

export interface CommitteeBase {
  id: number;
  name: string;
  defense_date: string;
  location: string;
  status: CommitteeStatus;
  registration_period: number;
  period_name?: string;
  academic_year?: string;
}

export interface LecturerCommittee extends CommitteeBase {
  view_as: 'lecturer';
  role_in_committee: CommitteeMemberRole;
  member_count: number;
  registration_count: number;
}

export interface StudentCommittee extends CommitteeBase {
  view_as: 'student';
  members: CommitteeMemberInfo[];
  registrations: CommitteeRegistrationInfo[];
  member_count: number;
  registration_count: number;
}

export interface StaffCommittee extends CommitteeBase {
  view_as: 'staff';
  member_count: number;
  registration_count: number;
}

export type MyCommittee = LecturerCommittee | StudentCommittee | StaffCommittee;

export interface CommitteeMemberInfo {
  id: number;
  lecturer: number;
  lecturer_name: string;
  role: CommitteeMemberRole;
}

export interface CommitteeRegistrationInfo {
  id: number;
  student_id: string;
  student_name: string;
  lecturer_name: string;
  project_title: string;
  wants_thesis_upgrade: boolean;
  status: string;
}

export interface CommitteeDetail {
  id: number;
  name: string;
  defense_date: string;
  location: string;
  status: CommitteeStatus;
  members_detail: CommitteeMemberInfo[];
  registrations_detail: CommitteeRegistrationInfo[];
}

export interface GradeComponentData {
  id: number;
  registration: number;
  grade_type: string;
  component: string;
  graded_by_lecturer: number | null;
  graded_by_committee_member: number | null;
  is_final: boolean;
  score: string;
  comment: string;
  graded_at: string;
  created_date: string;
  updated_date: string;
}

export interface CommitteeMemberGradeData {
  id: number;
  member_id: number | null;
  lecturer_id: number | null;
  member_name: string | null;
  role: string | null;
  score: string;
  comment: string;
  is_final: boolean;
  graded_at: string;
}

export interface RegistrationGradeData {
  registration: number;
  process: GradeComponentData | null;
  final: GradeComponentData | null;
  reviewer: GradeComponentData | null;
  committee_members: CommitteeMemberGradeData[];
  committee_avg: number | null;
  supervisor_final: number | null;
  final_score: number | null;
}

export interface GradeInput {
  process?: number | null;
  reviewer?: number | null;
  committee?: number | null;
  comment?: string;
}

export interface MemberGrade {
  member_id: number;
  member_name: string;
  role: CommitteeMemberRole;
  process?: number | null;
  reviewer?: number | null;
  committee?: number | null;
  comment?: string;
}

export interface LecturerGradeRow {
  id: number;
  student_name: string;
  student_id: string;
  project_title: string;
  is_thesis: boolean;
  wants_thesis_upgrade: boolean;
  process: number | null;
  reviewer: number | null;
  committee: number | null;
  supervisor_final: number | null;
  avg: number | null;
  process_grade_id: number | null;
  final_grade_id: number | null;
}

export interface StudentGradeRow {
  id: number;
  project_title: string;
  process: number | null;
  process_comment: string;
  reviewer: number | null;
  reviewer_comment: string;
  committee: number | null;
  committee_comment: string;
}

export type ReportStatus = 'pending' | 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'late';

export interface ReportColumn {
  key: string;
  label: string;
  schedule_id: number | null;
  deadline: string;
}

export interface ReportEntry {
  status: ReportStatus;
  report_id: number | null;
  submitted_at: string | null;
}

export type StudentReports = Record<string, ReportEntry>;

export interface StudentReportRow {
  id: number;
  student_id: string;
  student_name: string;
  project_title: string;
  reports: StudentReports;
}

export interface ReportTableData {
  columns: ReportColumn[];
  rows: StudentReportRow[];
}

export interface Schedules {
  id: number;
  sequence_number: number;
  title?: string;
  deadline?: string;
}

export type ApiCallback<T> = (data: T) => void;
export type ErrorCallback = (type: string, message: string, data?: any) => void;

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
  link?: string;
}

export type ReviewerApprovalStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

export interface ReviewerAssignmentSession {
  id: number;
  registration_period: number;
  reviewer: number;
  reviewer_name: string;
  defense_date: string;
  location: string;
  assignment_count: number;
  created_by: number;
  created_date: string;
}

export interface ReviewerAssignmentRegistration {
  registration_id: number;
  student_name: string;
  student_id: string;
  project_title: string;
  approval_status: ReviewerApprovalStatus;
}

export interface ReviewerAssignmentDetail {
  id: number;
  registration_period: number;
  reviewer: number;
  reviewer_name: string;
  defense_date: string;
  location: string;
  assignments: ReviewerAssignmentRegistration[];
  created_by: number;
  created_date: string;
}
