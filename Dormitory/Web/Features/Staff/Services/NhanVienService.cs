using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Staff.DTOs;
using Dormitory.Web.Features.Staff.Mappings;

namespace Dormitory.Web.Features.Staff.Services
{
    public class NhanVienService : INhanVienService
    {
        private readonly ApplicationDbContext _context;

        public NhanVienService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<StaffItemDto>> GetAllStaffAsync(
            string? deptKey = null,
            string? roleKey = null,
            string? status = null,
            string? search = null)
        {
            var staffList = await _context.NhanViens
                .Include(n => n.TaiKhoan)
                    .ThenInclude(t => t!.VaiTro)
                .Include(n => n.ToaNhaPhuTrach)
                .ToListAsync();

            var result = new List<StaffItemDto>();

            foreach (var n in staffList)
            {
                result.Add(n.ToStaffItemDto());
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                result = result.Where(st => st.Name.ToLower().Contains(s) || st.Code.ToLower().Contains(s) || st.Phone.Contains(s) || st.Email.ToLower().Contains(s)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(deptKey) && deptKey != "ALL")
            {
                result = result.Where(st => st.DepartmentKey.Equals(deptKey, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(roleKey) && roleKey != "ALL")
            {
                result = result.Where(st => st.RoleKey.Equals(roleKey, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                result = result.Where(st => st.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return result;
        }

        public async Task<StaffItemDto> CreateStaffAsync(CreateStaffDto req)
        {
            var code = $"NV-{Random.Shared.Next(100, 999):D5}";
            var entity = new NhanVien
            {
                MaNhanVien = code,
                HoTen = req.Name.Trim(),
                ChucVu = req.Position.Trim(),
                DienThoai = req.Phone.Trim(),
                Email = req.Email.Trim(),
                TrangThai = "dangLam"
            };

            _context.NhanViens.Add(entity);

            string username = req.Email.Split('@')[0].ToLower();
            _context.TaiKhoans.Add(new TaiKhoan
            {
                TenDangNhap = username,
                MatKhauHash = "123456",
                MaVaiTro = req.Role,
                MaNhanVien = code,
                LaDangHoat = true
            });

            await _context.SaveChangesAsync();

            var createdStaff = await _context.NhanViens
                .Include(n => n.TaiKhoan)
                    .ThenInclude(t => t!.VaiTro)
                .Include(n => n.ToaNhaPhuTrach)
                .FirstAsync(n => n.MaNhanVien == code);

            return createdStaff.ToStaffItemDto();
        }

        public async Task<bool> ToggleStaffStatusAsync(string staffId)
        {
            var nv = await _context.NhanViens
                .Include(n => n.TaiKhoan)
                .FirstOrDefaultAsync(n => n.MaNhanVien == staffId || $"NV-{n.MaNhanVien}" == staffId);

            if (nv != null)
            {
                bool isNowActive = nv.TrangThai != "dangLam";
                nv.TrangThai = isNowActive ? "dangLam" : "nghiViec";
                if (nv.TaiKhoan != null)
                {
                    nv.TaiKhoan.LaDangHoat = isNowActive;
                }
                await _context.SaveChangesAsync();
            }

            return true;
        }
    }
}
