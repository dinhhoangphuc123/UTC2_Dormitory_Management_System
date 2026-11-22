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
            string? search = null,
            string? academicYear = null)
        {
            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null)
                return new List<RoomListItemDto>();

            var query = _context.Phongs
                .Include(p => p.ToaNha)
                .Include(p => p.LoaiPhong)
                .Include(p => p.DanhSachGiuong)
                    .ThenInclude(g => g.DanhSachHopDong.Where(h =>
                        h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear &&
                        (h.TrangThai == "hieuLuc" || h.TrangThai == "tamNgung")))
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

            var list = entities.Select(p => p.ToRoomListItemDto(year.NgayBatDau, year.NgayKetThuc)).ToList();

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL" && status != "all")
            {
                // Hỗ trợ cả khóa tiếng Anh từ API lẫn nhãn tiếng Việt trên giao diện.
                var normalized = status.Trim().ToLowerInvariant();
                var expected = normalized switch
                {
                    "available" or "concho" or "còn chỗ" => "Còn chỗ",
                    "full" or "day" or "đầy" => "Đầy",
                    "maintenance" or "baotri" or "bảo trì" => "Bảo trì",
                    _ => status.Trim()
                };
                list = list.Where(r => r.Status.Equals(expected, StringComparison.OrdinalIgnoreCase)).ToList();
            }

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

        public async Task<bool> ToggleBedMaintenanceAsync(string bedId, string? academicYear = null)
        {
            if (string.IsNullOrWhiteSpace(academicYear) ||
                !await _context.NamHocs.AnyAsync(n => n.MaNamHoc == academicYear))
                return false;

            var bed = await _context.Giuongs.FirstOrDefaultAsync(g => g.MaGiuong == bedId);
            if (bed != null)
            {
                // Không được đưa giường vào bảo trì khi vẫn còn hợp đồng đang hiệu lực.
                bool hasActiveContract = await _context.HopDongs.AnyAsync(h =>
                    h.MaGiuong == bedId &&
                    h.TrangThai != "daKetThuc" && h.TrangThai != "daHuy");
                if (hasActiveContract)
                {
                    return false;
                }

                bed.LaDangHoat = !bed.LaDangHoat;
                await _context.SaveChangesAsync();
                return true;
            }

            return false;
        }
    }
}
