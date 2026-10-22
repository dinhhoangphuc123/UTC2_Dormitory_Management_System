export interface ClassItem {
  id: string;
  code: string;
  name: string;
  faculty: string;
  facultyKey: string;
  advisor: string;
  cohort: string;
  residents: number;
  totalStudents: number;
  rate: number;
}

export interface UtilityItem {
  id: string;
  room: string;
  building: string;
  floor: number;
  capacity: string;
  oldElectric: number;
  newElectric: number | null;
  usageElectric: number | null;
  oldWater: number;
  newWater: number | null;
  usageWater: number | null;
  services: string[];
  status: 'RECORDED' | 'PENDING' | 'EXCEEDED';
  updatedAt?: string;
}

export interface InvoiceItemData {
  id: string;
  code: string;
  room: string;
  building: string;
  studentName: string;
  studentId: string;
  title: string;
  category: 'tonghop' | 'phong' | 'diennuoc' | 'guixe';
  categoryColor: string;
  amount: number;
  dueDate: string;
  isOverdue: boolean;
  overdueText?: string;
  method: string;
  methodIcon: string;
  status: 'paid' | 'pending' | 'overdue';
  statusLabel: string;
}

export interface TicketItemData {
  id: string;
  code: string;
  room: string;
  building: string;
  category: 'Điện dân dụng' | 'Nước / Vệ sinh' | 'Khóa cửa / Cửa sổ' | 'Đồ gỗ / Giường tủ' | 'Thiết bị mạng';
  title: string;
  description: string;
  reporter: string;
  phone: string;
  technician: string | null;
  priority: 'Khẩn cấp' | 'Bình thường';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
}

export interface ViolationItemData {
  id: string;
  code: string;
  studentId: string;
  studentName: string;
  room: string;
  building: string;
  violation: string;
  violationType: 'cook' | 'noise' | 'guest' | 'gambling' | 'electric' | 'smoke';
  date: string;
  penalty: string;
  penaltyType: 'remind' | 'reprimand' | 'warning' | 'expel';
  status: 'Đã thi hành' | 'Đang khiếu nại' | 'Chờ duyệt';
  notes: string;
}

export interface StaffItemData {
  id: string;
  code: string;
  name: string;
  avatarText: string;
  lastLogin: string;
  position: string;
  department: string;
  departmentKey: 'bql' | 'gt' | 'kt' | 'tc' | 'bv';
  managedArea: string;
  phone: string;
  email: string;
  role: 'System Admin' | 'Ban Quản lý' | 'Kỹ thuật viên' | 'Chỉ xem (Viewer)' | 'Kế toán';
  roleKey: 'admin' | 'manager' | 'operator' | 'viewer';
  status: 'active' | 'locked';
}

export const INITIAL_CLASSES: ClassItem[] = [
  {
    id: 'c1',
    code: 'CNTT-K63A',
    name: 'Kỹ thuật Phần mềm K63A',
    faculty: 'Khoa Công nghệ thông tin',
    facultyKey: 'cntt',
    advisor: 'TS. Vũ Minh Hoàng',
    cohort: 'k63',
    residents: 34,
    totalStudents: 52,
    rate: 65.4,
  },
  {
    id: 'c2',
    code: 'KTVT-K64B',
    name: 'Logistics & QL Chuỗi cung ứng B',
    faculty: 'Khoa Kinh tế vận tải',
    facultyKey: 'ktvt',
    advisor: 'ThS. Lê Thúy Hằng',
    cohort: 'k64',
    residents: 28,
    totalStudents: 60,
    rate: 46.7,
  },
  {
    id: 'c3',
    code: 'CKOTO-K65',
    name: 'Kỹ thuật Ô tô K65',
    faculty: 'Khoa Cơ khí',
    facultyKey: 'ck',
    advisor: 'TS. Trần Anh Tuấn',
    cohort: 'k65',
    residents: 45,
    totalStudents: 55,
    rate: 81.8,
  },
  {
    id: 'c4',
    code: 'KTXD-K62A',
    name: 'Kỹ thuật Xây dựng Dân dụng',
    faculty: 'Khoa Kỹ thuật xây dựng',
    facultyKey: 'ktxd',
    advisor: 'PGS.TS. Ngô Bảo Châu',
    cohort: 'k62',
    residents: 19,
    totalStudents: 48,
    rate: 39.6,
  },
  {
    id: 'c5',
    code: 'DTT-K64',
    name: 'Kỹ thuật Điện tử & Viễn thông',
    faculty: 'Khoa Điện - Điện tử',
    facultyKey: 'dt',
    advisor: 'ThS. Phạm Ngọc Long',
    cohort: 'k64',
    residents: 31,
    totalStudents: 50,
    rate: 62.0,
  },
  {
    id: 'c6',
    code: 'KTCT-K63B',
    name: 'Kỹ thuật Xây dựng Cầu đường',
    faculty: 'Khoa Kỹ thuật Công trình',
    facultyKey: 'ct',
    advisor: 'TS. Hoàng Đắc Khoa',
    cohort: 'k63',
    residents: 38,
    totalStudents: 45,
    rate: 84.4,
  },
  {
    id: 'c7',
    code: 'QTKD-K65',
    name: 'Quản trị Kinh doanh Vận tải',
    faculty: 'Khoa Kinh tế vận tải',
    facultyKey: 'ktvt',
    advisor: 'ThS. Đỗ Thị Mai Liên',
    cohort: 'k65',
    residents: 22,
    totalStudents: 58,
    rate: 37.9,
  },
  {
    id: 'c8',
    code: 'CNTT-K64C',
    name: 'Mạng máy tính & An toàn TT',
    faculty: 'Khoa Công nghệ thông tin',
    facultyKey: 'cntt',
    advisor: 'TS. Bùi Quốc Việt',
    cohort: 'k64',
    residents: 40,
    totalStudents: 53,
    rate: 75.5,
  },
];

export const INITIAL_UTILITIES: UtilityItem[] = [
  {
    id: 'u1',
    room: 'A01-201',
    building: 'A01',
    floor: 2,
    capacity: 'Tầng 2 · 8 Chỗ',
    oldElectric: 1240,
    newElectric: 1415,
    usageElectric: 175,
    oldWater: 84,
    newWater: 96,
    usageWater: 12,
    services: ['Net', 'Rác'],
    status: 'RECORDED',
  },
  {
    id: 'u2',
    room: 'A01-202',
    building: 'A01',
    floor: 2,
    capacity: 'Tầng 2 · 8 Chỗ',
    oldElectric: 2810,
    newElectric: 3125,
    usageElectric: 315,
    oldWater: 140,
    newWater: 168,
    usageWater: 28,
    services: ['Net', 'Rác'],
    status: 'EXCEEDED',
  },
  {
    id: 'u3',
    room: 'A01-203',
    building: 'A01',
    floor: 2,
    capacity: 'Tầng 2 · 6 Chỗ',
    oldElectric: 980,
    newElectric: 1110,
    usageElectric: 130,
    oldWater: 62,
    newWater: 71,
    usageWater: 9,
    services: ['Rác'],
    status: 'RECORDED',
  },
  {
    id: 'u4',
    room: 'A01-204',
    building: 'A01',
    floor: 2,
    capacity: 'Tầng 2 · 8 Chỗ',
    oldElectric: 1540,
    newElectric: null,
    usageElectric: null,
    oldWater: 95,
    newWater: null,
    usageWater: null,
    services: ['Net', 'Rác'],
    status: 'PENDING',
  },
  {
    id: 'u5',
    room: 'A01-205',
    building: 'A01',
    floor: 2,
    capacity: 'Tầng 2 · 8 Chỗ',
    oldElectric: 2100,
    newElectric: 2288,
    usageElectric: 188,
    oldWater: 112,
    newWater: 126,
    usageWater: 14,
    services: ['Net', 'Rác'],
    status: 'RECORDED',
  },
  {
    id: 'u6',
    room: 'A01-206',
    building: 'A01',
    floor: 2,
    capacity: 'Tầng 2 · 6 Chỗ',
    oldElectric: 1620,
    newElectric: 1782,
    usageElectric: 162,
    oldWater: 88,
    newWater: 100,
    usageWater: 12,
    services: ['Net', 'Rác'],
    status: 'RECORDED',
  },
  {
    id: 'u7',
    room: 'A01-207',
    building: 'A01',
    floor: 2,
    capacity: 'Tầng 2 · 8 Chỗ',
    oldElectric: 1890,
    newElectric: null,
    usageElectric: null,
    oldWater: 104,
    newWater: null,
    usageWater: null,
    services: ['Rác'],
    status: 'PENDING',
  },
  {
    id: 'u8',
    room: 'A01-208',
    building: 'A01',
    floor: 2,
    capacity: 'Tầng 2 · 8 Chỗ',
    oldElectric: 2430,
    newElectric: 2780,
    usageElectric: 350,
    oldWater: 120,
    newWater: 145,
    usageWater: 25,
    services: ['Net', 'Rác'],
    status: 'EXCEEDED',
  },
];

export const INITIAL_INVOICES: InvoiceItemData[] = [
  {
    id: 'inv1',
    code: 'HD-202603-0891',
    room: 'A2-304',
    building: 'A2',
    studentName: 'Trần Minh Hoàng',
    studentId: '72DCHT21045',
    title: 'Tổng hợp T03 (Phòng + Điện nước)',
    category: 'tonghop',
    categoryColor: '#375ba9',
    amount: 1480000,
    dueDate: '15/03/2026',
    isOverdue: false,
    method: 'VNPAY QR',
    methodIcon: 'qr_code_2',
    status: 'paid',
    statusLabel: 'Đã nộp',
  },
  {
    id: 'inv2',
    code: 'HD-202603-0892',
    room: 'B1-102',
    building: 'B1',
    studentName: 'Lê Thị Mai Khanh',
    studentId: '72DCOT22019',
    title: 'Điện nước Tháng 02/2026',
    category: 'diennuoc',
    categoryColor: '#0b2a5b',
    amount: 340000,
    dueDate: '15/03/2026',
    isOverdue: false,
    method: 'Chuyển khoản',
    methodIcon: 'account_balance',
    status: 'paid',
    statusLabel: 'Đã nộp',
  },
  {
    id: 'inv3',
    code: 'HD-202603-0904',
    room: 'A3-512',
    building: 'A3',
    studentName: 'Nguyễn Quốc Tuấn',
    studentId: '71DCCK20112',
    title: 'Tiền phòng KTX HK2',
    category: 'phong',
    categoryColor: '#88a9fd',
    amount: 2750000,
    dueDate: '10/03/2026',
    isOverdue: true,
    overdueText: 'Quá 4 ngày',
    method: 'Chưa có',
    methodIcon: '',
    status: 'pending',
    statusLabel: 'Chờ nộp',
  },
  {
    id: 'inv4',
    code: 'HD-202603-0915',
    room: 'A1-205',
    building: 'A1',
    studentName: 'Võ Đăng Khôi',
    studentId: '73DCVT23004',
    title: 'Phí gửi xe máy (6 tháng)',
    category: 'guixe',
    categoryColor: '#747780',
    amount: 420000,
    dueDate: '20/03/2026',
    isOverdue: false,
    method: 'Tiền mặt',
    methodIcon: 'payments',
    status: 'paid',
    statusLabel: 'Đã nộp',
  },
  {
    id: 'inv5',
    code: 'HD-202603-0922',
    room: 'B2-401',
    building: 'B2',
    studentName: 'Phạm Thị Bích Ngọc',
    studentId: '72DCKT22081',
    title: 'Tổng hợp T03 (Phòng + Điện nước)',
    category: 'tonghop',
    categoryColor: '#375ba9',
    amount: 1620000,
    dueDate: '20/03/2026',
    isOverdue: false,
    method: 'Chờ cổng TT',
    methodIcon: '',
    status: 'pending',
    statusLabel: 'Chờ nộp',
  },
  {
    id: 'inv6',
    code: 'HD-202603-0938',
    room: 'A2-110',
    building: 'A2',
    studentName: 'Đỗ Văn Hùng',
    studentId: '70DCDD19054',
    title: 'Truy thu Điện vượt định mức T01, T02',
    category: 'diennuoc',
    categoryColor: '#ba1a1a',
    amount: 890000,
    dueDate: '28/02/2026',
    isOverdue: true,
    overdueText: 'Quá 14 ngày',
    method: 'Chưa có',
    methodIcon: '',
    status: 'overdue',
    statusLabel: 'Nợ khó đòi',
  },
];

export const INITIAL_TICKETS: TicketItemData[] = [
  {
    id: 't1',
    code: 'SC-2601',
    room: 'A2-308',
    building: 'A2',
    category: 'Điện dân dụng',
    title: 'Chập aptomat chính gây mất điện phòng, có khét',
    description: 'Chập aptomat chính gây mất điện toàn phòng, có mùi khét nguy hiểm khi bật điều hòa',
    reporter: 'Lê Quốc Bảo',
    phone: '0918.442.190',
    technician: null,
    priority: 'Khẩn cấp',
    status: 'PENDING',
    createdAt: '22/10/2026 08:30',
  },
  {
    id: 't2',
    code: 'SC-2598',
    room: 'B1-112',
    building: 'B1',
    category: 'Nước / Vệ sinh',
    title: 'Bể van cấp nước lavabo rò rỉ sàn nhà tắm',
    description: 'Bể vòi van cấp nước lavabo rò rỉ ngập sàn nhà tắm gây trơn trượt',
    reporter: 'Trần Thu Hà',
    phone: '0982.114.733',
    technician: 'Phạm Thành',
    priority: 'Khẩn cấp',
    status: 'IN_PROGRESS',
    createdAt: '21/10/2026 14:15',
  },
  {
    id: 't3',
    code: 'SC-2595',
    room: 'A1-405',
    building: 'A1',
    category: 'Khóa cửa / Cửa sổ',
    title: 'Kẹt chìa khóa cửa chính, chốt lỏng',
    description: 'Kẹt chìa khóa phòng cửa chính, chốt bị lỏng khó khóa khi ra ngoài',
    reporter: 'Nguyễn Văn Huy',
    phone: '0903.665.129',
    technician: 'Vũ Tuấn',
    priority: 'Bình thường',
    status: 'IN_PROGRESS',
    createdAt: '21/10/2026 09:20',
  },
  {
    id: 't4',
    code: 'SC-2592',
    room: 'C1-201',
    building: 'C1',
    category: 'Thiết bị mạng',
    title: 'Cổng LAN giường 03 gãy lẫy tiếp xúc',
    description: 'Cổng mạng dây LAN góc giường 03 gãy lẫy tiếp xúc, không nhận tín hiệu',
    reporter: 'Hoàng Minh Đức',
    phone: '0934.789.201',
    technician: null,
    priority: 'Bình thường',
    status: 'PENDING',
    createdAt: '20/10/2026 16:45',
  },
  {
    id: 't5',
    code: 'SC-2589',
    room: 'B2-504',
    building: 'B2',
    category: 'Đồ gỗ / Giường tủ',
    title: 'Thanh giát giường nứt gãy',
    description: 'Thanh giát giường tầng dưới bị nứt gãy cần thay thanh gỗ mới',
    reporter: 'Đỗ Mỹ Linh',
    phone: '0977.892.441',
    technician: 'Đặng Long',
    priority: 'Bình thường',
    status: 'COMPLETED',
    createdAt: '19/10/2026 10:10',
  },
  {
    id: 't6',
    code: 'SC-2588',
    room: 'A2-202',
    building: 'A2',
    category: 'Điện dân dụng',
    title: 'Quạt trần kêu to và rung mạnh số 2',
    description: 'Quạt trần phòng rung lắc mạnh kêu to khi bật số 2, số 3',
    reporter: 'Vũ Trọng Nam',
    phone: '0945.332.118',
    technician: 'Phạm Thành',
    priority: 'Bình thường',
    status: 'COMPLETED',
    createdAt: '18/10/2026 11:05',
  },
];

export const INITIAL_VIOLATIONS: ViolationItemData[] = [
  {
    id: 'v1',
    code: 'BB-2026-089',
    studentId: '72DCHT21045',
    studentName: 'Trần Minh Hoàng',
    room: 'P.304',
    building: 'A01',
    violation: 'Nấu ăn sai quy định (bếp điện)',
    violationType: 'cook',
    date: '26/10/2026',
    penalty: 'Khiển trách',
    penaltyType: 'reprimand',
    status: 'Đã thi hành',
    notes: 'Nấu ăn sai quy định (bếp điện công suất lớn 2000W)',
  },
  {
    id: 'v2',
    code: 'BB-2026-088',
    studentId: '73DCOT20112',
    studentName: 'Lê Quốc Bảo',
    room: 'P.202',
    building: 'B01',
    violation: 'Gây ồn ào quá giờ quy định',
    violationType: 'noise',
    date: '25/10/2026',
    penalty: 'Nhắc nhở',
    penaltyType: 'remind',
    status: 'Đã thi hành',
    notes: 'Gây ồn ào quá 23:00, ảnh hưởng phòng lân cận',
  },
  {
    id: 'v3',
    code: 'BB-2026-087',
    studentId: '71DCVT19008',
    studentName: 'Phạm Thị Mai',
    room: 'P.410',
    building: 'A02',
    violation: 'Dẫn người ngoài qua đêm',
    violationType: 'guest',
    date: '24/10/2026',
    penalty: 'Cảnh cáo cấp 2',
    penaltyType: 'warning',
    status: 'Đang khiếu nại',
    notes: 'Dẫn người ngoài vào phòng lưu trú qua đêm không đăng ký',
  },
  {
    id: 'v4',
    code: 'BB-2026-086',
    studentId: '72DCKT22194',
    studentName: 'Nguyễn Văn Đức',
    room: 'P.108',
    building: 'B02',
    violation: 'Tổ chức cờ bạc tại phòng',
    violationType: 'gambling',
    date: '22/10/2026',
    penalty: 'Buộc rời KTX',
    penaltyType: 'expel',
    status: 'Đã thi hành',
    notes: 'Tàng trữ chất cấm và tổ chức cờ bạc ăn tiền tại phòng',
  },
  {
    id: 'v5',
    code: 'BB-2026-085',
    studentId: '74DCCN23401',
    studentName: 'Võ Nhật Quang',
    room: 'P.501',
    building: 'A01',
    violation: 'Tự ý câu nối đường điện',
    violationType: 'electric',
    date: '21/10/2026',
    penalty: 'Cảnh cáo - Trừ 5đ',
    penaltyType: 'warning',
    status: 'Đang khiếu nại',
    notes: 'Tự ý đấu nối nguồn điện sinh hoạt làm nhảy CB tầng',
  },
  {
    id: 'v6',
    code: 'BB-2026-084',
    studentId: '73DCXD21012',
    studentName: 'Đỗ Tuấn Kiệt',
    room: 'P.215',
    building: 'B01',
    violation: 'Hút thuốc trong khuôn viên',
    violationType: 'smoke',
    date: '20/10/2026',
    penalty: 'Khiển trách',
    penaltyType: 'reprimand',
    status: 'Đã thi hành',
    notes: 'Hút thuốc lá trong hành lang ký túc xá',
  },
];

export const INITIAL_STAFF: StaffItemData[] = [
  {
    id: 's1',
    code: 'NV-00102',
    name: 'Nguyễn Văn An',
    avatarText: 'NA',
    lastLogin: '10 phút trước',
    position: 'Trưởng Ban Quản lý',
    department: 'Ban Quản trị KTX',
    departmentKey: 'bql',
    managedArea: 'Toàn bộ KTX',
    phone: '0918.234.567',
    email: 'an.nv@utc2.edu.vn',
    role: 'System Admin',
    roleKey: 'admin',
    status: 'active',
  },
  {
    id: 's2',
    code: 'NV-00108',
    name: 'Trần Thị Hương',
    avatarText: 'TH',
    lastLogin: '2 giờ trước',
    position: 'Giám thị trưởng',
    department: 'Tổ Giám thị & Sinh viên',
    departmentKey: 'gt',
    managedArea: 'Tòa A & Tòa B',
    phone: '0982.345.671',
    email: 'huong.tt@utc2.edu.vn',
    role: 'Ban Quản lý',
    roleKey: 'manager',
    status: 'active',
  },
  {
    id: 's3',
    code: 'NV-00115',
    name: 'Lê Hoàng Minh',
    avatarText: 'LM',
    lastLogin: 'Hôm qua',
    position: 'Kỹ sư Cơ điện',
    department: 'Tổ Kỹ thuật - Vận hành',
    departmentKey: 'kt',
    managedArea: 'Trạm Điện & Tòa C',
    phone: '0903.112.449',
    email: 'minh.lh@utc2.edu.vn',
    role: 'Kỹ thuật viên',
    roleKey: 'operator',
    status: 'active',
  },
  {
    id: 's4',
    code: 'NV-00122',
    name: 'Phạm Đức Toàn',
    avatarText: 'PT',
    lastLogin: '5 ngày trước',
    position: 'Đội trưởng Bảo vệ',
    department: 'Tổ An ninh Trật tự',
    departmentKey: 'bv',
    managedArea: 'Cổng chính & Tuần tra',
    phone: '0977.892.113',
    email: 'toan.pd@utc2.edu.vn',
    role: 'Chỉ xem (Viewer)',
    roleKey: 'viewer',
    status: 'active',
  },
  {
    id: 's5',
    code: 'NV-00089',
    name: 'Vũ Hải Thanh',
    avatarText: 'VT',
    lastLogin: 'Đã đình chỉ công tác',
    position: 'Kế toán viên',
    department: 'Tổ Thu chi & Hóa đơn',
    departmentKey: 'tc',
    managedArea: 'Văn phòng BQL',
    phone: '0934.567.890',
    email: 'thanh.vh@utc2.edu.vn',
    role: 'Kế toán',
    roleKey: 'operator',
    status: 'locked',
  },
];

export const BUILDING_OPERATIONS = [
  { name: 'Tòa A01 (Nam)', rooms: 75, beds: 600, occupied: 588, vacant: 12, rate: 98.0, revenue: '912.400.000 đ', status: 'Ổn định', statusColor: 'stable' },
  { name: 'Tòa A02 (Nam)', rooms: 75, beds: 600, occupied: 576, vacant: 24, rate: 96.0, revenue: '894.200.000 đ', status: 'Ổn định', statusColor: 'stable' },
  { name: 'Tòa A03 (Nam)', rooms: 75, beds: 600, occupied: 562, vacant: 38, rate: 93.6, revenue: '860.500.000 đ', status: 'Bảo trì 3 phòng', statusColor: 'warning' },
  { name: 'Tòa B01 (Nữ)', rooms: 75, beds: 600, occupied: 592, vacant: 8, rate: 98.6, revenue: '928.000.000 đ', status: 'Ổn định', statusColor: 'stable' },
  { name: 'Tòa B02 (Nữ)', rooms: 75, beds: 600, occupied: 574, vacant: 26, rate: 95.6, revenue: '896.100.000 đ', status: 'Ổn định', statusColor: 'stable' },
  { name: 'Tòa B03 (Dịch vụ cao cấp)', rooms: 75, beds: 600, occupied: 428, vacant: 72, rate: 85.6, revenue: '748.800.000 đ', status: 'Kiểm định PCCC', statusColor: 'info' },
];
