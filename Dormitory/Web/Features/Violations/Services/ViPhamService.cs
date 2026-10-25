using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Violations.DTOs;
using Dormitory.Web.Features.Violations.Entities;
using Dormitory.Web.Features.Violations.Mappings;

namespace Dormitory.Web.Features.Violations.Services
{
    public class ViPhamService : IViPhamService
    {
        private readonly ApplicationDbContext _context;

        public ViPhamService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<ViolationRecordDto>> GetAllViolationsAsync(
            string? building = null,
            string? penaltyType = null,
            string? violationType = null,
            string? search = null,
            string? academicYear = null)
        {
            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null) return new List<ViolationRecordDto>();

            var endExclusive = year.NgayKetThuc.Date.AddDays(1);
            var list = await _context.ViPhams
                .Where(v => v.NgayViPham >= year.NgayBatDau && v.NgayViPham < endExclusive)
                .Include(v => v.SinhVien)
                    .ThenInclude(s => s!.DanhSachHopDong.Where(h => h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear))
                        .ThenInclude(h => h.Giuong)
                            .ThenInclude(g => g!.Phong)
                                .ThenInclude(p => p!.ToaNha)
                .Include(v => v.LoaiViPham)
                .Include(v => v.NhanVienLap)
                .OrderByDescending(v => v.NgayViPham)
                .ToListAsync();

            var result = list.Select(v => v.ToViolationRecordDto()).ToList();

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                result = result.Where(v => v.Code.ToLower().Contains(s) || v.StudentId.ToLower().Contains(s) || v.StudentName.ToLower().Contains(s) || v.Room.ToLower().Contains(s)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(building) && building != "ALL")
            {
                result = result.Where(v => v.Building.Equals(building, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(penaltyType) && penaltyType != "ALL")
            {
                result = result.Where(v => v.PenaltyType.Equals(penaltyType, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(violationType) && violationType != "ALL")
            {
                result = result.Where(v => v.ViolationType.Equals(violationType, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return result;
        }

        public async Task<List<ViolationTypeOptionDto>> GetViolationTypesAsync(string? academicYear = null)
        {
            if (string.IsNullOrWhiteSpace(academicYear) ||
                !await _context.NamHocs.AnyAsync(n => n.MaNamHoc == academicYear))
                return new List<ViolationTypeOptionDto>();

            return await _context.LoaiViPhams
                .OrderBy(v => v.TenLoaiViPham)
                .Select(v => new ViolationTypeOptionDto { Id = v.MaLoaiViPham, Name = v.TenLoaiViPham })
                .ToListAsync();
        }

        public async Task<ViolationRecordDto?> CreateViolationAsync(CreateViolationDto req, string? academicYear = null)
        {
            var year = string.IsNullOrWhiteSpace(academicYear)
                ? null
                : await _context.NamHocs.FirstOrDefaultAsync(n => n.MaNamHoc == academicYear);
            if (year == null || DateTime.Today < year.NgayBatDau.Date || DateTime.Today > year.NgayKetThuc.Date)
                return null;

            var student = await _context.SinhViens
                .FirstOrDefaultAsync(s => s.MaSinhVien == req.StudentId &&
                    ((s.NamNhapHoc >= year.NgayBatDau.Year && s.NamNhapHoc <= year.NgayKetThuc.Year) ||
                     s.DanhSachHopDong.Any(h => h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear) ||
                     s.DanhSachDonDangKy.Any(d => d.DotDangKy != null && d.DotDangKy.KyHoc != null && d.DotDangKy.KyHoc.MaNamHoc == academicYear)));
            var violationType = await _context.LoaiViPhams
                .FirstOrDefaultAsync(v => v.MaLoaiViPham == req.ViolationTypeId);
            if (student == null || violationType == null)
            {
                return null;
            }

            var entity = new ViPham
            {
                MaSinhVien = student.MaSinhVien,
                MaLoaiViPham = violationType.MaLoaiViPham,
                NgayViPham = DateTime.Today,
                NoiDung = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
                HinhThucXuLy = req.PenaltyType switch
                {
                    "remind" => "nhacNho",
                    "warning" => "canhCao",
                    "expel" => "buocRaKhoi",
                    _ => "khienTrach"
                },
                MaNhanVienLap = null
            };

            _context.ViPhams.Add(entity);
            await _context.SaveChangesAsync();

            return (await _context.ViPhams
                .Include(v => v.SinhVien)
                    .ThenInclude(s => s!.DanhSachHopDong.Where(h => h.KyHoc != null && h.KyHoc.MaNamHoc == academicYear))
                        .ThenInclude(h => h.Giuong)
                            .ThenInclude(g => g!.Phong)
                                .ThenInclude(p => p!.ToaNha)
                .Include(v => v.LoaiViPham)
                .Include(v => v.NhanVienLap)
                .FirstAsync(v => v.MaViPham == entity.MaViPham))
                .ToViolationRecordDto();
        }
    }
}
