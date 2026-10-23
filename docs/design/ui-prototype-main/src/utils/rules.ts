import { Application, Contract, Room, Student } from '../types';

/**
 * Calculates occupancy rate percentage with 1 decimal precision
 */
export function calculateOccupancyPercentage(occupied: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((occupied / total) * 1000) / 10;
}

/**
 * Formats Vietnamese Dong currency neatly (e.g. 1.280.000.000 -> 1,28 Tỷ đ, or exact standard 500.000 đ)
 */
export function formatCurrencyVND(amount: number, compact: boolean = false): string {
  if (compact) {
    if (amount >= 1_000_000_000) {
      const billions = (amount / 1_000_000_000).toFixed(2).replace('.', ',');
      return `${billions} Tỷ đ`;
    }
    if (amount >= 1_000_000) {
      const millions = (amount / 1_000_000).toFixed(0);
      return `${millions} Tr đ`;
    }
  }
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

/**
 * Categorizes contract urgency based on remaining days
 */
export function getContractUrgency(
  remainingDays: number, 
  status: string
): 'critical' | 'warning' | 'normal' | 'ended' {
  if (status === 'Đã thanh lý') return 'ended';
  if (remainingDays <= 5) return 'critical';
  if (remainingDays <= 15) return 'warning';
  return 'normal';
}

/**
 * Filters applications by status, priority, and search keyword
 */
export function filterApplications(
  apps: Application[],
  filters: {
    status?: string;
    priority?: string;
    gender?: string;
    cohort?: string;
    search?: string;
  }
): Application[] {
  return apps.filter((app) => {
    if (filters.status && filters.status !== 'all' && filters.status !== 'Tất cả' && filters.status !== 'Tất cả (420)') {
      if (app.status !== filters.status) return false;
    }
    if (filters.priority && filters.priority !== 'all' && filters.priority !== 'Tất cả' && filters.priority !== 'Diện: Tất cả') {
      if (!app.priorityCategory.toLowerCase().includes(filters.priority.toLowerCase())) return false;
    }
    if (filters.gender && filters.gender !== 'all' && filters.gender !== 'Tất cả') {
      const gNorm = filters.gender.toLowerCase();
      if (gNorm === 'nam' && app.gender !== 'Nam') return false;
      if (gNorm === 'nu' && app.gender !== 'Nữ') return false;
    }
    if (filters.cohort && filters.cohort !== 'all' && filters.cohort !== 'Tất cả') {
      if (!app.cohort.toLowerCase().includes(filters.cohort.toLowerCase())) return false;
    }
    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      const matchName = app.studentName.toLowerCase().includes(q);
      const matchCode = app.applicationCode.toLowerCase().includes(q);
      const matchMssv = app.mssv.toLowerCase().includes(q);
      const matchMajor = app.major.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchMssv && !matchMajor) return false;
    }
    return true;
  });
}

/**
 * Filters students by search, cohort, major, and residence status
 */
export function filterStudents(
  students: Student[],
  filters: {
    search?: string;
    cohort?: string;
    major?: string;
    status?: string;
    building?: string;
  }
): Student[] {
  return students.filter((s) => {
    if (filters.cohort && filters.cohort !== 'all' && filters.cohort !== 'Tất cả Khóa' && filters.cohort !== 'Khóa: Tất cả') {
      const c = filters.cohort.toUpperCase();
      if (!s.cohort.toUpperCase().includes(c) && !s.className.toUpperCase().includes(c)) return false;
    }
    if (filters.major && filters.major !== 'all' && filters.major !== 'Tất cả Khoa viện' && filters.major !== 'Ngành: Tất cả') {
      const m = filters.major.toLowerCase();
      if (!s.major.toLowerCase().includes(m) && !s.className.toLowerCase().includes(m)) return false;
    }
    if (filters.status && filters.status !== 'all' && filters.status !== 'Tất cả trạng thái' && filters.status !== 'Trạng thái: Tất cả') {
      if (filters.status === 'o' || filters.status === 'Đang ở') {
        if (s.residenceStatus !== 'Đang ở') return false;
      } else if (filters.status === 'tam-vang' || filters.status === 'Tạm vắng') {
        if (s.residenceStatus !== 'Tạm vắng') return false;
      } else if (filters.status === 'da-tra' || filters.status === 'Đã trả phòng') {
        if (s.residenceStatus !== 'Đã trả phòng') return false;
      }
    }
    if (filters.building && filters.building !== 'all' && filters.building !== 'Tất cả Tòa' && filters.building !== 'Tòa: Tất cả') {
      if (!s.buildingId.toLowerCase().includes(filters.building.toLowerCase()) && !s.roomNumber.toLowerCase().includes(filters.building.toLowerCase())) {
        return false;
      }
    }
    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchMssv = s.mssv.toLowerCase().includes(q);
      const matchCccd = s.cccd.toLowerCase().includes(q);
      const matchRoom = s.roomNumber.toLowerCase().includes(q);
      const matchHome = s.hometown.toLowerCase().includes(q);
      if (!matchName && !matchMssv && !matchCccd && !matchRoom && !matchHome) return false;
    }
    return true;
  });
}

/**
 * Computes building statistics from list of rooms
 */
export function computeRoomStats(rooms: Room[]): {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  emptyBeds: number;
  maintenanceBeds: number;
  occupancyPercent: number;
} {
  const totalRooms = rooms.length;
  let totalBeds = 0;
  let occupiedBeds = 0;
  let emptyBeds = 0;
  let maintenanceBeds = 0;

  for (const r of rooms) {
    totalBeds += r.capacity;
    for (const b of r.beds) {
      if (b.status === 'Đang ở') occupiedBeds++;
      else if (b.status === 'Bảo trì') maintenanceBeds++;
      else emptyBeds++;
    }
  }

  return {
    totalRooms,
    totalBeds,
    occupiedBeds,
    emptyBeds,
    maintenanceBeds,
    occupancyPercent: calculateOccupancyPercentage(occupiedBeds, totalBeds),
  };
}
