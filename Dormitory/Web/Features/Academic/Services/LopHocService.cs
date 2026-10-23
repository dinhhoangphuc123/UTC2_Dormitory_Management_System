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

        public async Task<List<ClassItemDto>> GetAllClassesAsync(string? facultyKey = null, string? cohort = null, string? search = null)
        {
            var query = _context.LopHocs
                .Include(l => l.DanhSachSinhVien)
                    .ThenInclude(s => s.DanhSachHopDong)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                query = query.Where(l => l.MaLop.ToLower().Contains(s) || l.TenLop.ToLower().Contains(s) || l.TenKhoa.ToLower().Contains(s));
            }

            var list = await query.ToListAsync();

            var result = list.Select(l => l.ToClassItemDto()).ToList();

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
