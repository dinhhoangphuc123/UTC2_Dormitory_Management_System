using Microsoft.EntityFrameworkCore;
using Quan_ly_Ky_tuc_xa.Data;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Models.Entities;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Services.Implementations
{
    public class DienNuocDichVuService : IDienNuocDichVuService
    {
        private readonly ApplicationDbContext _context;

        public DienNuocDichVuService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<UtilityItemDto>> GetAllUtilitiesAsync(string? building = null, int? floor = null, string? status = null, string? search = null)
        {
            var rooms = await _context.Phongs
                .Include(p => p.ToaNha)
                .Include(p => p.LoaiPhong)
                .Include(p => p.DanhSachChiSoDienNuoc)
                .OrderBy(p => p.MaToaNha)
                .ThenBy(p => p.MaPhong)
                .ToListAsync();

            var result = new List<UtilityItemDto>();

            foreach (var r in rooms)
            {
                string roomNum = r.MaPhong.Split('_').Last();
                // Find latest electric reading
                var latestElectric = r.DanhSachChiSoDienNuoc
                    .Where(c => c.Loai == "dien")
                    .OrderByDescending(c => c.Nam)
                    .ThenByDescending(c => c.Thang)
                    .FirstOrDefault();

                // Find latest water reading
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
                result.Add(new UtilityItemDto
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
                });
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                result = result.Where(u => u.Room.ToLower().Contains(s) || u.Building.ToLower().Contains(s)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(building) && building != "ALL")
            {
                result = result.Where(u => u.Building.Equals(building, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (floor.HasValue && floor.Value > 0)
            {
                result = result.Where(u => u.Floor == floor.Value).ToList();
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                result = result.Where(u => u.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return result;
        }

        public async Task<UtilityItemDto?> RecordUtilityAsync(RecordUtilityDto req)
        {
            var room = await _context.Phongs
                .Include(p => p.ToaNha)
                .Include(p => p.LoaiPhong)
                .Include(p => p.DanhSachChiSoDienNuoc)
                .FirstOrDefaultAsync(p => p.MaPhong == req.RoomId || p.MaPhong.EndsWith(req.RoomId));

            if (room == null) return null;

            string roomNum = room.MaPhong.Split('_').Last();

            int nowMonth = DateTime.Now.Month;
            int nowYear = DateTime.Now.Year;

            // Update or add electric index
            var elecIndex = room.DanhSachChiSoDienNuoc.FirstOrDefault(c => c.Loai == "dien" && c.Thang == nowMonth && c.Nam == nowYear);
            var latestElec = room.DanhSachChiSoDienNuoc.Where(c => c.Loai == "dien").OrderByDescending(c => c.Nam).ThenByDescending(c => c.Thang).FirstOrDefault();
            decimal oldElec = elecIndex?.ChiSoCu ?? (latestElec != null ? latestElec.ChiSoMoi : (1200 + room.SoTang * 100));
            if (elecIndex == null)
            {
                elecIndex = new ChiSoDienNuoc
                {
                    MaPhong = room.MaPhong,
                    Loai = "dien",
                    Thang = nowMonth,
                    Nam = nowYear,
                    ChiSoCu = oldElec,
                    ChiSoMoi = req.NewElectric,
                    MaGia = "GIA_DIEN_2026",
                    NgayGhi = DateTime.Now,
                    MaNhanVienGhi = "NV001"
                };
                _context.ChiSoDienNuocs.Add(elecIndex);
            }
            else
            {
                elecIndex.ChiSoMoi = req.NewElectric;
                elecIndex.NgayGhi = DateTime.Now;
            }

            // Update or add water index
            var waterIndex = room.DanhSachChiSoDienNuoc.FirstOrDefault(c => c.Loai == "nuoc" && c.Thang == nowMonth && c.Nam == nowYear);
            var latestWat = room.DanhSachChiSoDienNuoc.Where(c => c.Loai == "nuoc").OrderByDescending(c => c.Nam).ThenByDescending(c => c.Thang).FirstOrDefault();
            decimal oldWater = waterIndex?.ChiSoCu ?? (latestWat != null ? latestWat.ChiSoMoi : (50 + room.SoTang * 10));
            if (waterIndex == null)
            {
                waterIndex = new ChiSoDienNuoc
                {
                    MaPhong = room.MaPhong,
                    Loai = "nuoc",
                    Thang = nowMonth,
                    Nam = nowYear,
                    ChiSoCu = oldWater,
                    ChiSoMoi = req.NewWater,
                    MaGia = "GIA_NUOC_2026",
                    NgayGhi = DateTime.Now,
                    MaNhanVienGhi = "NV001"
                };
                _context.ChiSoDienNuocs.Add(waterIndex);
            }
            else
            {
                waterIndex.ChiSoMoi = req.NewWater;
                waterIndex.NgayGhi = DateTime.Now;
            }

            await _context.SaveChangesAsync();

            int usageElec = Math.Max(0, req.NewElectric - (int)oldElec);
            int usageWat = Math.Max(0, req.NewWater - (int)oldWater);
            bool isOver = usageElec > 250 || usageWat > 20;

            var activeServices = new List<string>();
            if (req.HasInternet) activeServices.Add("Net");
            if (req.HasTrash) activeServices.Add("Rác");

            return new UtilityItemDto
            {
                Id = room.MaPhong,
                Room = $"{room.MaToaNha}-{roomNum}",
                Building = room.MaToaNha,
                Floor = room.SoTang,
                Capacity = $"Tầng {room.SoTang} · {room.LoaiPhong?.SoNguoiToiDa ?? 8} Chỗ",
                OldElectric = (int)oldElec,
                NewElectric = req.NewElectric,
                UsageElectric = usageElec,
                OldWater = (int)oldWater,
                NewWater = req.NewWater,
                UsageWater = usageWat,
                Services = activeServices,
                Status = isOver ? "EXCEEDED" : "RECORDED",
                UpdatedAt = DateTime.Now.ToString("dd/MM/yyyy HH:mm")
            };
        }
    }

    internal static class ListExtension
    {
        public static void push(this List<string> list, string item) => list.Add(item);
    }
}
