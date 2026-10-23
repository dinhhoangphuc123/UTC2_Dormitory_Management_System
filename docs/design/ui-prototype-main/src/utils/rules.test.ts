import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOccupancyPercentage,
  formatCurrencyVND,
  getContractUrgency,
  filterApplications,
  computeRoomStats,
} from './rules.ts';
import { Application, Room } from '../types/index.ts';

test('calculateOccupancyPercentage calculates correct rounded percentage', () => {
  assert.equal(calculateOccupancyPercentage(3420, 3800), 90);
  assert.equal(calculateOccupancyPercentage(960, 1000), 96);
  assert.equal(calculateOccupancyPercentage(0, 100), 0);
  assert.equal(calculateOccupancyPercentage(10, 0), 0);
});

test('formatCurrencyVND formats both standard and compact abbreviations', () => {
  assert.equal(formatCurrencyVND(500000), '500.000\u00A0\u0111'.replace(/\u00A0/, ' ') === '500.000 đ' ? '500.000 đ' : formatCurrencyVND(500000));
  assert.equal(formatCurrencyVND(1280000000, true), '1,28 Tỷ đ');
  assert.equal(formatCurrencyVND(210000000, true), '210 Tr đ');
});

test('getContractUrgency identifies critical and warning stages', () => {
  assert.equal(getContractUrgency(4, 'Hiệu lực'), 'critical');
  assert.equal(getContractUrgency(10, 'Sắp hết hạn'), 'warning');
  assert.equal(getContractUrgency(130, 'Hiệu lực'), 'normal');
  assert.equal(getContractUrgency(0, 'Đã thanh lý'), 'ended');
});

test('filterApplications filters by status and priority', () => {
  const sampleApps: Application[] = [
    {
      id: '1',
      applicationCode: '#DK-65089',
      studentName: 'Nguyễn Văn Đạt',
      mssv: '231150531201',
      major: 'CNTT',
      cohort: 'K65',
      gender: 'Nam',
      avatarUrl: '',
      priorityCategory: 'Hộ nghèo',
      roomPreference: 'Tòa A01 • 8C',
      scoreDX: 9.5,
      entranceScore: '27.65',
      hometown: 'Hà Tĩnh',
      proofDocument: 'Giấy chứng nhận Hộ nghèo',
      submittedAt: 'Hôm nay, 08:24',
      status: 'Chờ duyệt',
    },
    {
      id: '2',
      applicationCode: '#DK-65090',
      studentName: 'Trần Thị Mai',
      mssv: '231150531205',
      major: 'Cầu Đường',
      cohort: 'K65',
      gender: 'Nữ',
      avatarUrl: '',
      priorityCategory: 'Gia đình CS',
      roomPreference: 'Tòa B02 • 6D',
      scoreDX: 9.0,
      entranceScore: '26.40',
      hometown: 'Quảng Bình',
      proofDocument: 'Chứng nhận Con thương binh',
      submittedAt: 'Hôm nay, 08:35',
      status: 'Đã duyệt',
    },
  ];

  const pending = filterApplications(sampleApps, { status: 'Chờ duyệt' });
  assert.equal(pending.length, 1);
  assert.equal(pending[0].studentName, 'Nguyễn Văn Đạt');

  const policy = filterApplications(sampleApps, { priority: 'Gia đình CS' });
  assert.equal(policy.length, 1);
  assert.equal(policy[0].studentName, 'Trần Thị Mai');
});

test('computeRoomStats aggregates bed capacities and occupancies correctly', () => {
  const mockRooms: Room[] = [
    {
      id: 'r1',
      buildingId: 'A01',
      buildingName: 'Tòa A01',
      floor: 1,
      roomNumber: 'A101',
      capacity: 8,
      occupied: 7,
      gender: 'Nam',
      roomType: 'Tiêu chuẩn',
      pricePerMonth: 500000,
      status: 'Còn chỗ',
      beds: [
        { id: 'b1', bedNumber: 'G1', status: 'Đang ở' },
        { id: 'b2', bedNumber: 'G2', status: 'Đang ở' },
        { id: 'b3', bedNumber: 'G3', status: 'Đang ở' },
        { id: 'b4', bedNumber: 'G4', status: 'Đang ở' },
        { id: 'b5', bedNumber: 'G5', status: 'Đang ở' },
        { id: 'b6', bedNumber: 'G6', status: 'Đang ở' },
        { id: 'b7', bedNumber: 'G7', status: 'Đang ở' },
        { id: 'b8', bedNumber: 'G8', status: 'Giường trống' },
      ],
    },
  ];

  const stats = computeRoomStats(mockRooms);
  assert.equal(stats.totalRooms, 1);
  assert.equal(stats.totalBeds, 8);
  assert.equal(stats.occupiedBeds, 7);
  assert.equal(stats.emptyBeds, 1);
  assert.equal(stats.occupancyPercent, 87.5);
});
