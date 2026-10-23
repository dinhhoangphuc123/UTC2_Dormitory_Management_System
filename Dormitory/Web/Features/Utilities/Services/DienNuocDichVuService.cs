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

            var serviceRows = await GetActiveServicesAsync();
            var servicesByRoom = serviceRows
                .GroupBy(row => row.RoomId)
                .ToDictionary(group => group.Key, group => group.Select(row => row.Name).Distinct().ToList());
            var result = rooms.Select(r => r.ToUtilityItemDto(servicesByRoom.GetValueOrDefault(r.MaPhong))).ToList();
            if (result.Count > 0)
            {
                var electricityRate = await GetCurrentRateAsync("dien", DateTime.Today);
                var waterRate = await GetCurrentRateAsync("nuoc", DateTime.Today);
                foreach (var item in result)
                {
                    item.ElectricityRate = electricityRate?.Gia;
                    item.WaterRate = waterRate?.Gia;
                }
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
                .FirstOrDefaultAsync(p => p.MaPhong == req.RoomId);

            if (room == null) return null;

            var now = DateTime.Now;
            int nowMonth = now.Month;
            int nowYear = now.Year;

            var elecIndex = room.DanhSachChiSoDienNuoc.FirstOrDefault(c => c.Loai == "dien" && c.Thang == nowMonth && c.Nam == nowYear);
            var latestElec = room.DanhSachChiSoDienNuoc.Where(c => c.Loai == "dien").OrderByDescending(c => c.Nam).ThenByDescending(c => c.Thang).FirstOrDefault();
            var oldElec = elecIndex?.ChiSoCu ?? latestElec?.ChiSoMoi;
            var elecRate = elecIndex == null
                ? await GetCurrentRateAsync("dien", now.Date)
                : null;

            var waterIndex = room.DanhSachChiSoDienNuoc.FirstOrDefault(c => c.Loai == "nuoc" && c.Thang == nowMonth && c.Nam == nowYear);
            var latestWat = room.DanhSachChiSoDienNuoc.Where(c => c.Loai == "nuoc").OrderByDescending(c => c.Nam).ThenByDescending(c => c.Thang).FirstOrDefault();
            var oldWater = waterIndex?.ChiSoCu ?? latestWat?.ChiSoMoi;
            var waterRate = waterIndex == null
                ? await GetCurrentRateAsync("nuoc", now.Date)
                : null;

            if (!oldElec.HasValue || !oldWater.HasValue ||
                req.NewElectric < oldElec.Value || req.NewWater < oldWater.Value ||
                (elecIndex == null && elecRate == null) ||
                (waterIndex == null && waterRate == null))
            {
                return null;
            }

            if (elecIndex == null)
            {
                elecIndex = new ChiSoDienNuoc
                {
                    MaPhong = room.MaPhong,
                    Loai = "dien",
                    Thang = nowMonth,
                    Nam = nowYear,
                    ChiSoCu = oldElec.Value,
                    ChiSoMoi = req.NewElectric,
                    MaGia = elecRate!.MaGia,
                    NgayGhi = now
                };
                _context.ChiSoDienNuocs.Add(elecIndex);
            }
            else
            {
                elecIndex.ChiSoMoi = req.NewElectric;
                elecIndex.NgayGhi = now;
            }

            if (waterIndex == null)
            {
                waterIndex = new ChiSoDienNuoc
                {
                    MaPhong = room.MaPhong,
                    Loai = "nuoc",
                    Thang = nowMonth,
                    Nam = nowYear,
                    ChiSoCu = oldWater.Value,
                    ChiSoMoi = req.NewWater,
                    MaGia = waterRate!.MaGia,
                    NgayGhi = now
                };
                _context.ChiSoDienNuocs.Add(waterIndex);
            }
            else
            {
                waterIndex.ChiSoMoi = req.NewWater;
                waterIndex.NgayGhi = now;
            }

            await _context.SaveChangesAsync();

            decimal usageElec = req.NewElectric - oldElec.Value;
            decimal usageWat = req.NewWater - oldWater.Value;
            bool isOver = usageElec > 250 || usageWat > 20;
            string roomNum = room.MaPhong.Split('_').Last();

            return new UtilityItemDto
            {
                Id = room.MaPhong,
                Room = $"{room.MaToaNha}-{roomNum}",
                Building = room.MaToaNha,
                Floor = room.SoTang,
                Capacity = $"Tầng {room.SoTang} · {room.LoaiPhong?.SoNguoiToiDa ?? 0} Chỗ",
                OldElectric = oldElec,
                NewElectric = req.NewElectric,
                UsageElectric = usageElec,
                OldWater = oldWater,
                NewWater = req.NewWater,
                UsageWater = usageWat,
                Services = await GetServicesForRoomAsync(room.MaPhong),
                Status = isOver ? "EXCEEDED" : "RECORDED",
                UpdatedAt = now.ToString("dd/MM/yyyy HH:mm")
            };
        }

        private Task<GiaDienNuoc?> GetCurrentRateAsync(string type, DateTime date) =>
            _context.GiaDienNuocs
                .Where(rate => rate.Loai == type &&
                    rate.NgayApDung <= date &&
                    (rate.NgayHetHieuLuc == null || rate.NgayHetHieuLuc >= date))
                .OrderByDescending(rate => rate.NgayApDung)
                .FirstOrDefaultAsync();

        private async Task<List<(string RoomId, string Name)>> GetActiveServicesAsync()
        {
            var today = DateTime.Today;
            return await _context.DangKyDichVus
                .Where(registration =>
                    registration.DichVu!.LaDangHoat &&
                    registration.HopDong!.TrangThai == "hieuLuc" &&
                    registration.HopDong.NgayBatDau <= today &&
                    registration.HopDong.NgayKetThuc >= today &&
                    registration.NgayBatDau <= today &&
                    (registration.NgayKetThuc == null || registration.NgayKetThuc >= today))
                .Select(registration => new ValueTuple<string, string>(
                    registration.HopDong!.Giuong!.MaPhong,
                    registration.DichVu!.TenDichVu))
                .ToListAsync();
        }

        private async Task<List<string>> GetServicesForRoomAsync(string roomId) =>
            (await GetActiveServicesAsync())
                .Where(service => service.RoomId == roomId)
                .Select(service => service.Name)
                .Distinct()
                .ToList();
    }
}
