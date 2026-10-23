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

            if (!result.Any())
            {
                result = GetDefaultDemoStaff();
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
                MaVaiTro = req.Role == "System Admin" ? "admin" : (req.Role == "Kế toán" ? "keToan" : "quanLy"),
                MaNhanVien = code,
                LaDangHoat = true
            });

            await _context.SaveChangesAsync();

            return entity.ToStaffItemDto(req);
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

        private static List<StaffItemDto> GetDefaultDemoStaff()
        {
            return new List<StaffItemDto>
            {
                new() { Id = "s1", Code = "NV-00102", Name = "Nguyễn Văn An", AvatarText = "NA", LastLogin = "10 phút trước", Position = "Trưởng Ban Quản lý", Department = "Ban Quản trị KTX", DepartmentKey = "bql", ManagedArea = "Toàn bộ KTX", Phone = "0918.234.567", Email = "an.nv@utc2.edu.vn", Role = "System Admin", RoleKey = "admin", Status = "active" },
                new() { Id = "s2", Code = "NV-00108", Name = "Trần Thị Hương", AvatarText = "TH", LastLogin = "2 giờ trước", Position = "Giám thị trưởng", Department = "Tổ Giám thị & Sinh viên", DepartmentKey = "gt", ManagedArea = "Tòa A & Tòa B", Phone = "0982.345.671", Email = "huong.tt@utc2.edu.vn", Role = "Ban Quản lý", RoleKey = "manager", Status = "active" },
                new() { Id = "s3", Code = "NV-00115", Name = "Lê Hoàng Minh", AvatarText = "LM", LastLogin = "Hôm qua", Position = "Kỹ sư Cơ điện", Department = "Tổ Kỹ thuật - Vận hành", DepartmentKey = "kt", ManagedArea = "Trạm Điện & Tòa C", Phone = "0903.112.449", Email = "minh.lh@utc2.edu.vn", Role = "Kỹ thuật viên", RoleKey = "operator", Status = "active" },
                new() { Id = "s4", Code = "NV-00122", Name = "Phạm Đức Toàn", AvatarText = "PT", LastLogin = "5 ngày trước", Position = "Đội trưởng Bảo vệ", Department = "Tổ An ninh Trật tự", DepartmentKey = "bv", ManagedArea = "Cổng chính & Tuần tra", Phone = "0977.892.113", Email = "toan.pd@utc2.edu.vn", Role = "Chỉ xem (Viewer)", RoleKey = "viewer", Status = "active" },
                new() { Id = "s5", Code = "NV-00089", Name = "Vũ Hải Thanh", AvatarText = "VT", LastLogin = "Đã đình chỉ công tác", Position = "Kế toán viên", Department = "Tổ Thu chi & Hóa đơn", DepartmentKey = "tc", ManagedArea = "Văn phòng BQL", Phone = "0934.567.890", Email = "thanh.vh@utc2.edu.vn", Role = "Kế toán", RoleKey = "operator", Status = "locked" }
            };
        }
    }
}

