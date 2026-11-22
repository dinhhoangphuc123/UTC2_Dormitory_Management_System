using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.Utilities.DTOs;

namespace Dormitory.Web.Features.Utilities.Mappings
{
    public static class UtilityMappings
    {
        public static UtilityItemDto ToUtilityItemDto(
            this Phong r,
            int periodMonth,
            int periodYear,
            bool canEdit = true,
            string? lockReason = null,
            List<string>? services = null,
            List<string>? serviceCodes = null)
        {
            string roomNum = r.MaPhong.Split('_').Last();

            // Chỉ số hiển thị bám theo kỳ hiện tại. Khi sang tháng mới, tháng mới chưa ghi số
            // thì lấy chỉ số cuối của lần ghi trước làm chỉ số đầu kỳ để BQL nhìn thấy mốc bắt đầu.
            var currentElectric = r.DanhSachChiSoDienNuoc
                .FirstOrDefault(c => c.Loai == "dien" && c.Thang == periodMonth && c.Nam == periodYear);
            var currentWater = r.DanhSachChiSoDienNuoc
                .FirstOrDefault(c => c.Loai == "nuoc" && c.Thang == periodMonth && c.Nam == periodYear);

            var previousElectric = r.DanhSachChiSoDienNuoc
                .Where(c => c.Loai == "dien" && (c.Nam < periodYear || (c.Nam == periodYear && c.Thang < periodMonth)))
                .OrderByDescending(c => c.Nam).ThenByDescending(c => c.Thang)
                .FirstOrDefault();
            var previousWater = r.DanhSachChiSoDienNuoc
                .Where(c => c.Loai == "nuoc" && (c.Nam < periodYear || (c.Nam == periodYear && c.Thang < periodMonth)))
                .OrderByDescending(c => c.Nam).ThenByDescending(c => c.Thang)
                .FirstOrDefault();

            decimal? oldElec = currentElectric?.ChiSoCu ?? previousElectric?.ChiSoMoi;
            decimal? newElec = currentElectric?.ChiSoMoi;
            decimal? usageElec = (newElec.HasValue && oldElec.HasValue && newElec >= oldElec) ? (newElec.Value - oldElec.Value) : null;

            decimal? oldWat = currentWater?.ChiSoCu ?? previousWater?.ChiSoMoi;
            decimal? newWat = currentWater?.ChiSoMoi;
            decimal? usageWat = (newWat.HasValue && oldWat.HasValue && newWat >= oldWat) ? (newWat.Value - oldWat.Value) : null;

            string st = "PENDING";
            if (newElec.HasValue && newWat.HasValue)
            {
                if (usageElec > Shared.Constants.AppDefaults.ElectricUsageWarningKwh || usageWat > Shared.Constants.AppDefaults.WaterUsageWarningM3) st = "EXCEEDED";
                else st = "RECORDED";
            }

            string roomLabel = $"{r.MaToaNha}-{roomNum}";

            // Mỗi tháng một hóa đơn phòng: chỉ lấy đúng hóa đơn của kỳ hiện tại,
            // hóa đơn tháng cũ không còn hiển thị nhãn trên dòng của tháng mới.
            var bill = r.DanhSachHoaDonPhong?
                .FirstOrDefault(b => b.Thang == periodMonth && b.Nam == periodYear);

            // Hóa đơn tồn của kỳ trước vẫn phải chốt được dù giao diện đã sang kỳ mới.
            var pendingPriorBill = r.DanhSachHoaDonPhong?
                .Where(b => b.TrangThai == "chuaChot" && !(b.Thang == periodMonth && b.Nam == periodYear))
                .OrderByDescending(b => b.Nam).ThenByDescending(b => b.Thang)
                .FirstOrDefault();

            return new UtilityItemDto
            {
                Id = r.MaPhong,
                Room = roomLabel,
                Building = r.MaToaNha,
                Floor = r.SoTang,
                Capacity = $"Tầng {r.SoTang} · {r.LoaiPhong?.SoNguoiToiDa ?? 0} Chỗ",
                OldElectric = oldElec,
                NewElectric = newElec,
                UsageElectric = usageElec,
                OldWater = oldWat,
                NewWater = newWat,
                UsageWater = usageWat,
                Services = services ?? new List<string>(),
                ServiceCodes = serviceCodes ?? new List<string>(),
                Status = st,
                UpdatedAt = (currentElectric ?? previousElectric)?.NgayGhi.ToString("dd/MM/yyyy"),
                BillStatus = bill?.TrangThai,
                BillThang = bill?.Thang,
                BillNam = bill?.Nam,
                SoNguoiChia = bill?.SoNguoiChia,
                TienMoiNguoi = bill?.TienMoiNguoi,
                PeriodMonth = periodMonth,
                PeriodYear = periodYear,
                PendingBillThang = pendingPriorBill?.Thang,
                PendingBillNam = pendingPriorBill?.Nam,
                CanEdit = canEdit,
                LockReason = lockReason
            };
        }
    }
}
