// ==================== 用户相关 ====================
export type Role = 'ADMIN' | 'TEACHER' | 'ADVISOR' | 'PARENT' | 'STUDENT';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  student?: StudentBrief;
}

export interface StudentBrief {
  id: string;
  studentNo: string;
  className: string;
  grade: number;
}

export interface StudentInfo {
  id: string;
  name: string;
  studentNo: string;
  className: string;
  grade: number;
  hasQR?: boolean;
}

// ==================== 预约相关 ====================
export type AppointmentStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  maxBookings?: number;
  isActive?: boolean;
  appointments?: AppointmentBrief[];
}

export interface AppointmentBrief {
  id: string;
  studentName: string;
  className?: string;
  status: AppointmentStatus;
  note?: string;
  bookerRole?: string;
}

export interface Appointment {
  id: string;
  studentName?: string;
  studentNo?: string;
  className?: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  note?: string;
  bookerRole?: string;
  bookerName?: string;
  createdAt?: string;
}

// ==================== 树洞相关 ====================
export type TreeholeStatus = 'PENDING' | 'REPLIED' | 'READ';

export interface TreeholeMessage {
  id: string;
  content: string;
  isAnonymous: boolean;
  status: TreeholeStatus;
  viewCode?: string;
  studentInfo?: { name?: string; className?: string; grade?: number; studentNo?: string };
  reply?: string | null;
  createdAt: string;
  repliedAt?: string;
  hasReply?: boolean;
}

// ==================== 通知相关 ====================
export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  refId?: string;
  refType?: string;
  createdAt: string;
}

// ==================== 班级 ====================
export interface ClassInfo {
  id: string;
  name: string;
  grade: number;
  studentCount?: number;
}

// ==================== 绑定孩子 ====================
export interface ChildBinding {
  id: string;
  name: string;
  studentNo: string;
  className: string;
  grade: number;
  relation: string;
}
