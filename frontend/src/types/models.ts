export type UserRole = 'student' | 'lecturer' | 'staff' | 'admin';
export type DifficultyLevel = 'easy' | 'medium' | 'difficult';
export type RegistrationStatus = 'waiting_lecturer' | 'assigned_lecturer' | 'approved' | 'rejected';

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
  role: 'main' | 'backup' | 'reviewer';
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
  is_Thesis?: boolean;
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
    role: 'main' | 'backup' | 'reviewer';
    approval_status: 'pending' | 'approved' | 'rejected' | 'skipped';
    note?: string;
    academic_degree?: string;
    specializations?: string[];
  }[];
  status_display?: string;
}

export interface RegistrationPeriod {
  id: number;
  name: string;
  academic_year: string;
}

export type ApiCallback<T> = (data: T) => void;
export type ErrorCallback = (type: string, message: string, data?: any) => void;
