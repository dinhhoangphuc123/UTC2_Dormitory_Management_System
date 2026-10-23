/**
 * Pure calculation and business logic functions for KTX UTC2 system
 */

export interface UtilityRecord {
  oldElectric: number;
  newElectric: number;
  oldWater: number;
  newWater: number;
  electricityRate?: number; // VND per kWh
  waterRate?: number; // VND per m3
  internetFee?: number;
  wasteFee?: number;
}

export interface UtilityConsumptionResult {
  electricUsage: number;
  waterUsage: number;
  isOverLimit: boolean;
  electricCost: number;
  waterCost: number;
  serviceCost: number;
  totalCost: number;
}

export const DEFAULT_ELECTRIC_RATE = 2800; // VND/kWh
export const DEFAULT_WATER_RATE = 14500; // VND/m3
export const ELECTRIC_LIMIT_KWH = 250;
export const WATER_LIMIT_M3 = 20;

/**
 * Calculates consumption and cost for a room utility record
 */
export function calculateUtilityUsage(record: UtilityRecord): UtilityConsumptionResult {
  const electricUsage = Math.max(0, record.newElectric - record.oldElectric);
  const waterUsage = Math.max(0, record.newWater - record.oldWater);
  
  const isOverLimit = electricUsage > ELECTRIC_LIMIT_KWH || waterUsage > WATER_LIMIT_M3;
  
  const electricRate = record.electricityRate ?? DEFAULT_ELECTRIC_RATE;
  const waterRate = record.waterRate ?? DEFAULT_WATER_RATE;
  const internetFee = record.internetFee ?? 0;
  const wasteFee = record.wasteFee ?? 0;

  const electricCost = electricUsage * electricRate;
  const waterCost = waterUsage * waterRate;
  const serviceCost = internetFee + wasteFee;
  const totalCost = electricCost + waterCost + serviceCost;

  return {
    electricUsage,
    waterUsage,
    isOverLimit,
    electricCost,
    waterCost,
    serviceCost,
    totalCost
  };
}

/**
 * Formats VND currency
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

/**
 * Formats metric number with dot separator (e.g. 48.250)
 */
export function formatMetricNumber(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(val);
}

/**
 * Calculates summary KPIs for invoices
 */
export interface InvoiceItem {
  id: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
}

export interface InvoiceSummary {
  totalExpected: number;
  totalPaid: number;
  totalUnpaid: number;
  overdueCount: number;
  overdueAmount: number;
  paidPercentage: number;
}

export function calculateInvoiceSummary(invoices: InvoiceItem[]): InvoiceSummary {
  let totalExpected = 0;
  let totalPaid = 0;
  let totalUnpaid = 0;
  let overdueCount = 0;
  let overdueAmount = 0;

  for (const inv of invoices) {
    totalExpected += inv.amount;
    if (inv.status === 'paid') {
      totalPaid += inv.amount;
    } else {
      totalUnpaid += inv.amount;
      if (inv.status === 'overdue') {
        overdueCount += 1;
        overdueAmount += inv.amount;
      }
    }
  }

  const paidPercentage = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

  return {
    totalExpected,
    totalPaid,
    totalUnpaid,
    overdueCount,
    overdueAmount,
    paidPercentage: Math.round(paidPercentage * 10) / 10
  };
}

/**
 * Calculates maintenance ticket counts by status
 */
export interface TicketItem {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export function countTicketsByStatus(tickets: TicketItem[]) {
  const summary = {
    total: tickets.length,
    pending: 0,
    inProgress: 0,
    completed: 0
  };

  for (const t of tickets) {
    if (t.status === 'PENDING') summary.pending += 1;
    else if (t.status === 'IN_PROGRESS') summary.inProgress += 1;
    else if (t.status === 'COMPLETED') summary.completed += 1;
  }

  return summary;
}

/**
 * Calculates dormitory building occupancy stats
 */
export interface BuildingStat {
  code: string;
  totalBeds: number;
  occupiedBeds: number;
}

export function calculateOccupancyStats(buildings: BuildingStat[]) {
  let totalBeds = 0;
  let occupiedBeds = 0;

  for (const b of buildings) {
    totalBeds += b.totalBeds;
    occupiedBeds += b.occupiedBeds;
  }

  const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  return {
    totalBeds,
    occupiedBeds,
    vacantBeds,
    occupancyRate: Math.round(occupancyRate * 10) / 10
  };
}
