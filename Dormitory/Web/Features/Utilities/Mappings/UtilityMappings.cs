using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.Utilities.DTOs;

namespace Dormitory.Web.Features.Utilities.Mappings
{
    public static class UtilityMappings
    {
        public static UtilityItemDto ToUtilityItemDto(this Phong r)
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

            int oldElec = latestElectric != null ? (int)latestElectric.ChiSoCu : 1200 + (r.SoTang * 100);
            int? newElec = latestElectric != null ? (int)latestElectric.ChiSoMoi : null;
            int? usageElec = (newElec.HasValue && newElec >= oldElec) ? (newElec.Value - oldElec) : null;

            int oldWat = latestWater != null ? (int)latestWater.ChiSoCu : 50 + (r.SoTang * 10);
            int? newWat = latestWater != null ? (int)latestWater.ChiSoMoi : null;
            int? usageWat = (newWat.HasValue && newWat >= oldWat) ? (newWat.Value - oldWat) : null;

            string st = "PENDING";
            if (newElec.HasValue && newWat.HasValue)
            {
                if (usageElec > 250 || usageWat > 20) st = "EXCEEDED";
                else st = "RECORDED";
            }

            var services = new List<string> { "Net", "Rác" };

            string roomLabel = $"{r.MaToaNha}-{roomNum}";
            return new UtilityItemDto
            {
                Id = r.MaPhong,
                Room = roomLabel,
                Building = r.MaToaNha,
                Floor = r.SoTang,
                Capacity = $"Tầng {r.SoTang} · {r.LoaiPhong?.SoNguoiToiDa ?? 8} Chỗ",
                OldElectric = oldElec,
                NewElectric = newElec,
                UsageElectric = usageElec,
                OldWater = oldWat,
                NewWater = newWat,
                UsageWater = usageWat,
                Services = services,
                Status = st,
                UpdatedAt = latestElectric != null ? latestElectric.NgayGhi.ToString("dd/MM/yyyy") : null
            };
        }
    }
}

