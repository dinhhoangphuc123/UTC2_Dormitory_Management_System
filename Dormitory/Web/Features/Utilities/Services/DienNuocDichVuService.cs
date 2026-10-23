using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Utilities.DTOs;
using Dormitory.Web.Features.Utilities.Entities;
using Dormitory.Web.Features.Utilities.Mappings;

namespace Dormitory.Web.Features.Utilities.Services
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

            var result = rooms.Select(r => r.ToUtilityItemDto()).ToList();

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
                    MaNhanVienGhi = "NV01"
                };
                _context.ChiSoDienNuocs.Add(elecIndex);
            }
            else
            {
                elecIndex.ChiSoMoi = req.NewElectric;
                elecIndex.NgayGhi = DateTime.Now;
            }

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
                    MaNhanVienGhi = "NV01"
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
}

