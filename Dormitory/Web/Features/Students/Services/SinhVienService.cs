using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Students.DTOs;
using Dormitory.Web.Features.Students.Mappings;

namespace Dormitory.Web.Features.Students.Services
{
    public class SinhVienService : ISinhVienService
    {
        private readonly ApplicationDbContext _context;

        public SinhVienService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<SinhVienListItemDto>> GetAllStudentsAsync(
            string? cohort = null,
            string? major = null,
            string? status = null,
            string? search = null)
        {
            var query = _context.SinhViens
                .Include(s => s.LopHoc)
                .Include(s => s.DanhSachHopDong)
                    .ThenInclude(h => h.Giuong)
                        .ThenInclude(g => g!.Phong)
                            .ThenInclude(p => p!.ToaNha)
                .Include(s => s.DanhSachHopDong)
                    .ThenInclude(h => h.DanhSachHoaDon)
                        .ThenInclude(i => i.DanhSachThanhToan)
                .Include(s => s.DanhSachHopDong)
                    .ThenInclude(h => h.DanhSachHoaDon)
                        .ThenInclude(i => i.DanhSachChiTietHoaDon)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                string q = search.Trim().ToLower();
                query = query.Where(s =>
                    s.HoTen.ToLower().Contains(q) ||
                    s.MaSinhVien.ToLower().Contains(q) ||
                    s.Cccd.Contains(q) ||
                    (s.DiaChiThuongTru != null && s.DiaChiThuongTru.ToLower().Contains(q)));
            }

            if (!string.IsNullOrWhiteSpace(cohort) && cohort != "all")
            {
                string c = cohort.ToUpper();
                query = query.Where(s => s.MaLop.ToUpper().Contains(c));
            }

            if (!string.IsNullOrWhiteSpace(major) && major != "all")
            {
                string m = major.ToLower();
                query = query.Where(s => s.LopHoc != null && (s.LopHoc.TenKhoa.ToLower().Contains(m) || s.LopHoc.TenLop.ToLower().Contains(m)));
            }

            var entities = await query.ToListAsync();
            return entities.Select(s => s.ToSinhVienListItemDto()).ToList();
        }

        public async Task<SinhVienListItemDto?> GetStudentByIdAsync(string id)
        {
            var students = await GetAllStudentsAsync();
            return students.FirstOrDefault(s => s.Mssv == id || s.Id == id);
        }

        public async Task<bool> TransferRoomAsync(string studentId, string newRoomNumber, string newBedNumber)
        {
            var contract = await _context.HopDongs
                .Include(h => h.Giuong)
                .FirstOrDefaultAsync(h => h.MaSinhVien == studentId && h.TrangThai == "hieuLuc");

            if (contract == null) return false;

            var targetBed = await _context.Giuongs
                .FirstOrDefaultAsync(g => g.MaPhong.EndsWith(newRoomNumber) && g.SoThuTu == int.Parse(newBedNumber.Replace("G", "").TrimStart('0')));

            if (targetBed != null)
            {
                contract.MaGiuong = targetBed.MaGiuong;
                await _context.SaveChangesAsync();
                return true;
            }

            return false;
        }
    }
}
