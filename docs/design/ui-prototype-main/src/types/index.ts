export type UserRole = 'Quản lý' | 'Kế toán' | 'Sinh viên' | 'Quản trị viên';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar: string;
  email: string;
  phone?: string;
  department?: string;
}

export type TabType = 
  | 'dashboard' 
  | 'don-dang-ky' 
  | 'hop-dong' 
  | 'sinh-vien' 
  | 'phong-va-giuong' 
  | 'lop-khoa' 
  | 'dien-nuoc-dich-vu' 
  | 'hoa-don' 
  | 'sua-chua' 
  | 'vi-pham' 
  | 'nhan-vien-tai-khoan' 
  | 'bao-cao';

export interface Student {
  id: string;
  mssv: string;
  name: string;
  cccd: string;
  avatarUrl: string;
  gender: 'Nam' | 'Nữ';
  cohort: string; // e.g. K64, K65
  major: string; // e.g. CNTT, Cơ khí
  className: string; // e.g. CNTT01 - K64
  buildingId: string; // e.g. A01, B02
  floor: number;
  roomNumber: string; // e.g. A102
  bedNumber: string; // e.g. G02
  phone: string;
  hometown: string;
  paymentStatus: 'Đủ' | 'Nợ' | 'Chưa đóng';
  debtAmount?: number; // VND
  residenceStatus: 'Đang ở' | 'Tạm vắng' | 'Đã trả phòng';
  admissionDate: string;
  birthDate?: string;
  ethnic?: string;
  priorityCategory?: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  studentId: string;
  studentName: string;
  mssv: string;
  avatarInitials: string;
  gender: 'Nam' | 'Nữ';
  roomNumber: string;
  bedNumber: string;
  buildingId: string;
  startDate: string;
  endDate: string;
  remainingDays: number;
  monthlyFee: number;
  depositAmount: number;
  depositStatus: 'Đã nộp' | 'Đã hoàn';
  status: 'Hiệu lực' | 'Sắp hết hạn' | 'Chờ thanh lý' | 'Đã thanh lý';
  statusNote?: string;
  note?: string;
}

export interface Application {
  id: string;
  applicationCode: string;
  studentName: string;
  mssv: string;
  major: string;
  cohort: string;
  gender: 'Nam' | 'Nữ';
  avatarUrl: string;
  priorityCategory: string; // Hộ nghèo, Gia đình CS, Điểm > 27.5, Vùng sâu KV1...
  roomPreference: string; // e.g. Tòa A01 • 8C
  scoreDX: number; // Điểm đề xuất (e.g. 9.5, 9.0)
  entranceScore: string; // e.g. 27.65 điểm
  hometown: string;
  proofDocument: string;
  submittedAt: string;
  status: 'Chờ duyệt' | 'Đã duyệt' | 'Bị từ chối';
}

export interface Bed {
  id: string;
  bedNumber: string; // G1 .. G8
  studentId?: string;
  studentName?: string;
  mssv?: string;
  status: 'Đang ở' | 'Giường trống' | 'Bảo trì';
}

export interface Room {
  id: string;
  buildingId: string;
  buildingName: string;
  floor: number;
  roomNumber: string;
  capacity: number; // usually 8
  occupied: number;
  gender: 'Nam' | 'Nữ';
  roomType: 'Tiêu chuẩn' | 'Chất lượng cao' | 'Quốc tế';
  pricePerMonth: number;
  status: 'Đầy' | 'Còn chỗ' | 'Bảo trì';
  beds: Bed[];
}

export interface UrgentTask {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  tagType: 'primary' | 'warning' | 'error' | 'neutral';
  icon: string;
  actionText: string;
  type: 'application' | 'repair' | 'debt' | 'checkout' | 'violation';
  completed?: boolean;
}
