using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Rooms.DTOs;
using Dormitory.Web.Features.Rooms.Mappings;

namespace Dormitory.Web.Features.Rooms.Services
{
    public class PhongService : IPhongService
    {
        private readonly ApplicationDbContext _context;

        public PhongService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<RoomListItemDto>> GetAllRoomsAsync(
            string? buildingId = null,
            int? floor = null,
            string? status = null,
            string? search = null)
        {
            var query = _context.Phongs
                .Include(p => p.ToaNha)
                .Include(p => p.LoaiPhong)
                .Include(p => p.DanhSachGiuong)
                    .ThenInclude(g => g.DanhSachHopDong)
                        .ThenInclude(h => h.SinhVien)
                .AsSplitQuery();

            if (!string.IsNullOrWhiteSpace(buildingId) && buildingId != "Tòa: Tất cả" && buildingId != "all")
            {
                string b = buildingId.Replace("Tòa ", "").Trim();
                query = query.Where(p => p.MaToaNha.Contains(b));
            }

            if (floor.HasValue && floor.Value > 0)
            {
                query = query.Where(p => p.SoTang == floor.Value);
            }

            var entities = await query.ToListAsync();

            var list = entities.Select(p => p.ToRoomListItemDto()).ToList();

            if (!string.IsNullOrWhiteSpace(search))
            {
                string q = search.Trim().ToLower();
                list = list.Where(r =>
                    r.RoomNumber.ToLower().Contains(q) ||
                    r.BuildingName.ToLower().Contains(q) ||
                    r.Beds.Any(b => b.StudentName != null && b.StudentName.ToLower().Contains(q)) ||
                    r.Beds.Any(b => b.Mssv != null && b.Mssv.Contains(q))
                ).ToList();
            }

            return list;
        }

        public async Task<bool> ToggleBedMaintenanceAsync(string bedId)
        {
            var bed = await _context.Giuongs.FirstOrDefaultAsync(g => g.MaGiuong == bedId);
            if (bed != null)
            {
                bed.LaDangHoat = !bed.LaDangHoat;
                await _context.SaveChangesAsync();
                return true;
            }

            return false;
        }
    }
}
