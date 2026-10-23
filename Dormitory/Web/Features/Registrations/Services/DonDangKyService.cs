using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Registrations.DTOs;
using Dormitory.Web.Features.Registrations.Mappings;

namespace Dormitory.Web.Features.Registrations.Services
{
    public class DonDangKyService : IDonDangKyService
    {
        private readonly ApplicationDbContext _context;

        public DonDangKyService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<ApplicationListItemDto>> GetAllApplicationsAsync(
            string? statusTab = null,
            string? priority = null,
            string? cohort = null,
            string? gender = null)
        {
            var query = _context.DonDangKys
                .Include(d => d.SinhVien)
                    .ThenInclude(s => s!.LopHoc)
                .Include(d => d.LoaiPhong)
                .AsQueryable();

            var entities = await query.ToListAsync();

            var list = entities.Select(d => d.ToApplicationListItemDto()).ToList();

            if (!string.IsNullOrWhiteSpace(statusTab) && statusTab != "all")
            {
                if (statusTab == "pending") list = list.Where(a => a.Status == "Chờ duyệt").ToList();
                else if (statusTab == "approved") list = list.Where(a => a.Status == "Đã duyệt").ToList();
                else if (statusTab == "rejected") list = list.Where(a => a.Status == "Bị từ chối").ToList();
            }

            if (!string.IsNullOrWhiteSpace(priority))
            {
                list = list.Where(a => a.PriorityCategory.ToLower().Contains(priority.ToLower())).ToList();
            }

            if (!string.IsNullOrWhiteSpace(gender) && gender != "all")
            {
                list = list.Where(a => a.Gender.Equals(gender, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return list;
        }

        public async Task<bool> ApproveApplicationAsync(string applicationId, string? staffId)
        {
            string cleanId = applicationId.Replace("#", "").Trim();
            var app = await _context.DonDangKys.FirstOrDefaultAsync(d => d.MaDonDangKy == cleanId);
            if (app == null || app.TrangThai != "choDuyet")
            {
                return false;
            }

            app.TrangThai = "daDuyet";
            app.MaNhanVienDuyet = staffId;
            app.NgayDuyet = DateTime.Now;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RejectApplicationAsync(string applicationId, string? staffId, string? reason = null)
        {
            string cleanId = applicationId.Replace("#", "").Trim();
            var app = await _context.DonDangKys.FirstOrDefaultAsync(d => d.MaDonDangKy == cleanId);
            if (app == null || app.TrangThai != "choDuyet")
            {
                return false;
            }

            app.TrangThai = "tuChoi";
            app.MaNhanVienDuyet = staffId;
            app.NgayDuyet = DateTime.Now;
            app.GhiChu = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
