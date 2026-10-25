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
            string? search = null,
            string? academicYear = null)
        {
            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null) return new List<SinhVienListItemDto>();

            var yearStart = year.NgayBatDau.Year;
            var yearEnd = year.NgayKetThuc.Year;
            var query = _context.SinhViens
                .Where(s =>
                    (s.NamNhapHoc >= yearStart && s.NamNhapHoc <= yearEnd) ||
                    s.DanhSachHopDong.Any(h => h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear) ||
                    s.DanhSachDonDangKy.Any(d => d.DotDangKy != null && d.DotDangKy.KyHoc != null && d.DotDangKy.KyHoc.MaNamHoc == academicYear))
                .Include(s => s.LopHoc)
                .Include(s => s.DanhSachHopDong.Where(h => h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear))
                    .ThenInclude(h => h.Giuong)
                        .ThenInclude(g => g!.Phong)
                            .ThenInclude(p => p!.ToaNha)
                .Include(s => s.DanhSachHopDong.Where(h => h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear))
                    .ThenInclude(h => h.DanhSachHoaDon)
                        .ThenInclude(i => i.DanhSachThanhToan)
                .Include(s => s.DanhSachHopDong.Where(h => h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear))
                    .ThenInclude(h => h.DanhSachHoaDon)
                        .ThenInclude(i => i.DanhSachChiTietHoaDon)
                .AsSplitQuery();

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

        public async Task<SinhVienListItemDto?> GetStudentByIdAsync(string id, string? academicYear = null)
        {
            var students = await GetAllStudentsAsync(academicYear: academicYear);
            return students.FirstOrDefault(s => s.Mssv == id || s.Id == id);
        }

    }
}
