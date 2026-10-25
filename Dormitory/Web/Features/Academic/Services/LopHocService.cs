using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Academic.DTOs;
using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Features.Academic.Mappings;

namespace Dormitory.Web.Features.Academic.Services
{
    public class LopHocService : ILopHocService
    {
        private readonly ApplicationDbContext _context;

        public LopHocService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<ClassItemDto>> GetAllClassesAsync(string? facultyKey = null, string? cohort = null, string? search = null, string? academicYear = null)
        {
            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null) return new List<ClassItemDto>();

            var startYear = year.NgayBatDau.Year;
            var endYear = year.NgayKetThuc.Year;
            var query = _context.LopHocs
                .Where(l =>
                    (l.NienKhoa >= startYear && l.NienKhoa <= endYear) ||
                    l.DanhSachSinhVien.Any(s =>
                        (s.NamNhapHoc >= startYear && s.NamNhapHoc <= endYear) ||
                        s.DanhSachHopDong.Any(h => h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear) ||
                        s.DanhSachDonDangKy.Any(d => d.DotDangKy != null && d.DotDangKy.KyHoc != null && d.DotDangKy.KyHoc.MaNamHoc == academicYear)))
                .Include(l => l.DanhSachSinhVien.Where(s =>
                    (s.NamNhapHoc >= startYear && s.NamNhapHoc <= endYear) ||
                    s.DanhSachHopDong.Any(h => h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear) ||
                    s.DanhSachDonDangKy.Any(d => d.DotDangKy != null && d.DotDangKy.KyHoc != null && d.DotDangKy.KyHoc.MaNamHoc == academicYear)))
                    .ThenInclude(s => s.DanhSachHopDong.Where(h => h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear))
                .AsSplitQuery();

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                query = query.Where(l => l.MaLop.ToLower().Contains(s) || l.TenLop.ToLower().Contains(s) || l.TenKhoa.ToLower().Contains(s));
            }

            var list = await query.ToListAsync();

            var result = list.Select(l => l.ToClassItemDto(year.NgayBatDau, year.NgayKetThuc)).ToList();

            if (!string.IsNullOrWhiteSpace(facultyKey) && facultyKey != "ALL")
            {
                result = result.Where(r => r.FacultyKey.Equals(facultyKey, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(cohort) && cohort != "ALL")
            {
                result = result.Where(r => r.Cohort.Equals(cohort, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return result;
        }

        public async Task<ClassItemDto> CreateClassAsync(CreateClassDto req)
        {
            int nienKhoa = int.Parse(req.Cohort.Trim()[1..], System.Globalization.CultureInfo.InvariantCulture);

            var entity = new LopHoc
            {
                MaLop = req.Code.Trim().ToUpper(),
                TenLop = req.Name.Trim(),
                TenKhoa = req.Faculty.Trim(),
                NienKhoa = nienKhoa
            };

            _context.LopHocs.Add(entity);
            await _context.SaveChangesAsync();

            return entity.ToClassItemDto();
        }
    }
}
