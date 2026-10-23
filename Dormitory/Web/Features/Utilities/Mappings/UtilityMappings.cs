using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.Utilities.DTOs;

namespace Dormitory.Web.Features.Utilities.Mappings
{
    public static class UtilityMappings
    {
        public static UtilityItemDto ToUtilityItemDto(this Phong r, List<string>? services = null)
        {
            string roomNum = r.MaPhong.Split('_').Last();
            var latestElectric = r.DanhSachChiSoDienNuoc
                .Where(c => c.Loai == "dien")
                .OrderByDescending(c => c.Nam)
                .ThenByDescending(c => c.Thang)
                .FirstOrDefault();

            var latestWater = r.DanhSachChiSoDienNuoc
                .Where(c => c.Loai == "nuoc")
                .OrderByDescending(c => c.Nam)
                .ThenByDescending(c => c.Thang)
                .FirstOrDefault();

            decimal? oldElec = latestElectric?.ChiSoCu;
            decimal? newElec = latestElectric?.ChiSoMoi;
            decimal? usageElec = (newElec.HasValue && oldElec.HasValue && newElec >= oldElec) ? (newElec.Value - oldElec.Value) : null;

            decimal? oldWat = latestWater?.ChiSoCu;
            decimal? newWat = latestWater?.ChiSoMoi;
            decimal? usageWat = (newWat.HasValue && oldWat.HasValue && newWat >= oldWat) ? (newWat.Value - oldWat.Value) : null;

            string st = "PENDING";
            if (newElec.HasValue && newWat.HasValue)
            {
                if (usageElec > 250 || usageWat > 20) st = "EXCEEDED";
                else st = "RECORDED";
            }

            string roomLabel = $"{r.MaToaNha}-{roomNum}";
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
                Status = st,
                UpdatedAt = latestElectric != null ? latestElectric.NgayGhi.ToString("dd/MM/yyyy") : null
            };
        }
    }
}
