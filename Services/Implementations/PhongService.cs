using Microsoft.EntityFrameworkCore;
using Quan_ly_Ky_tuc_xa.Data;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Services.Implementations
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
                .AsQueryable();

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

            var list = entities.Select(p =>
            {
                string roomNum = p.MaPhong.Split('_').Last();
                int capacity = p.LoaiPhong?.SoNguoiToiDa ?? 8;
                decimal price = p.LoaiPhong?.GiaThueThang ?? 500000;

                var beds = p.DanhSachGiuong.OrderBy(g => g.SoThuTu).Select(g =>
                {
                    var activeContract = g.DanhSachHopDong.FirstOrDefault(h => h.TrangThai == "hieuLuc");
                    string bedStatus = !g.LaDangHoat
                        ? "Bảo trì"
                        : (activeContract != null ? "Đang ở" : "Giường trống");

                    return new BedItemDto
                    {
                        Id = g.MaGiuong,
                        BedNumber = $"G{g.SoThuTu}",
                        StudentId = activeContract?.MaSinhVien,
                        StudentName = activeContract?.SinhVien?.HoTen,
                        Mssv = activeContract?.MaSinhVien,
                        Status = bedStatus
                    };
                }).ToList();

                // If DB has empty beds, generate default 8 beds
                if (beds.Count == 0)
                {
                    for (int i = 1; i <= 8; i++)
                    {
                        beds.Add(new BedItemDto
                        {
                            Id = $"{p.MaPhong}_G{i}",
                            BedNumber = $"G{i}",
                            Status = "Giường trống"
                        });
                    }
                }

                int occupied = beds.Count(b => b.Status == "Đang ở");
                bool isMaint = p.TrangThai == "baoTri" || beds.Any(b => b.Status == "Bảo trì");
                string roomStatus = isMaint ? "Bảo trì" : (occupied >= capacity ? "Đầy" : "Còn chỗ");

                return new RoomListItemDto
                {
                    Id = p.MaPhong,
                    BuildingId = p.MaToaNha,
                    BuildingName = p.ToaNha?.TenToaNha ?? $"Tòa {p.MaToaNha}",
                    Floor = p.SoTang,
                    RoomNumber = roomNum,
                    Capacity = capacity,
                    Occupied = occupied,
                    Gender = p.ToaNha?.GioiTinhQuyDinh == "nu" ? "Nữ" : "Nam",
                    RoomType = p.LoaiPhong?.TenLoaiPhong ?? "Tiêu chuẩn",
                    PricePerMonth = price,
                    Status = roomStatus,
                    Beds = beds
                };
            }).ToList();

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

