using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Accounts.Entities;
using Dormitory.Web.Features.Accounts.Services;
using Dormitory.Web.Features.Staff.DTOs;
using Dormitory.Web.Features.Staff.Entities;
using Dormitory.Web.Features.Staff.Mappings;

namespace Dormitory.Web.Features.Staff.Services
{
    public class NhanVienService : INhanVienService
    {
        private readonly ApplicationDbContext _context;
        private readonly IPasswordHasher _passwordHasher;

        public NhanVienService(ApplicationDbContext context, IPasswordHasher? passwordHasher = null)
        {
            _context = context;
            _passwordHasher = passwordHasher ?? new PasswordHasher();
        }

        public async Task<List<StaffItemDto>> GetAllStaffAsync(
            string? deptKey = null,
            string? roleKey = null,
            string? status = null,
            string? search = null)
        {
            var staffList = await _context.NhanViens
                .AsNoTracking()
                .Include(n => n.TaiKhoan)
                    .ThenInclude(t => t!.VaiTro)
                .Include(n => n.ToaNhaPhuTrach)
                .AsSplitQuery()
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
            var email = req.Email.Trim().ToLowerInvariant();
            var phone = req.Phone.Trim();

            if (await _context.NhanViens.AnyAsync(n => n.Email != null && n.Email.ToLower() == email))
            {
                throw new InvalidOperationException("Email này đã được sử dụng cho một nhân viên khác.");
            }

            if (!await _context.VaiTros.AnyAsync(v => v.MaVaiTro == req.Role))
            {
                throw new InvalidOperationException("Vai trò nhân viên không tồn tại trong hệ thống.");
            }

            var code = await GenerateStaffCodeAsync();
            var username = await GenerateUsernameAsync(email);
            var temporaryPassword = PasswordPolicy.GenerateTemporaryPassword();

            var entity = new NhanVien
            {
                MaNhanVien = code,
                HoTen = req.Name.Trim(),
                ChucVu = req.Position.Trim(),
                DienThoai = phone,
                Email = email,
                TrangThai = "dangLam"
            };

            _context.NhanViens.Add(entity);
            _context.TaiKhoans.Add(new TaiKhoan
            {
                TenDangNhap = username,
                MatKhauHash = _passwordHasher.HashPassword(temporaryPassword),
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

            var dto = createdStaff.ToStaffItemDto();
            dto.InitialPassword = temporaryPassword;
            dto.Username = username;
            return dto;
        }

        /// <summary>
        /// Sinh mã nhân viên tuần tự NV01, NV02... và kiểm tra lại trước khi ghi
        /// để tránh trùng mã do dùng số ngẫu nhiên.
        /// </summary>
        private async Task<string> GenerateStaffCodeAsync()
        {
            var existingCodes = await _context.NhanViens
                .Where(n => n.MaNhanVien.StartsWith("NV"))
                .Select(n => n.MaNhanVien)
                .ToListAsync();

            int maxNumber = 0;
            foreach (var existing in existingCodes)
            {
                var digits = new string(existing.Skip(2).Where(char.IsDigit).ToArray());
                if (int.TryParse(digits, out var number) && number > maxNumber)
                {
                    maxNumber = number;
                }
            }

            var candidate = $"NV{maxNumber + 1:D2}";
            while (await _context.NhanViens.AnyAsync(n => n.MaNhanVien == candidate))
            {
                maxNumber++;
                candidate = $"NV{maxNumber + 1:D2}";
            }

            return candidate;
        }

        /// <summary>
        /// Tạo tên đăng nhập từ phần trước @ của email và thêm hậu tố nếu đã tồn tại.
        /// </summary>
        private async Task<string> GenerateUsernameAsync(string email)
        {
            var localPart = email.Split('@')[0];
            var baseName = new string(localPart
                .Where(character => char.IsLetterOrDigit(character) || character is '.' or '_' or '-')
                .ToArray())
                .Trim('.', '_', '-')
                .ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(baseName))
            {
                baseName = "nhanvien";
            }

            if (baseName.Length > 40)
            {
                baseName = baseName[..40];
            }

            var candidate = baseName;
            int suffix = 1;
            while (await _context.TaiKhoans.AnyAsync(t => t.TenDangNhap == candidate))
            {
                suffix++;
                candidate = $"{baseName}{suffix}";
            }

            return candidate;
        }

        public async Task<bool> ToggleAccountAccessAsync(string staffId, string? currentStaffId = null)
        {
            if (string.IsNullOrWhiteSpace(staffId)) return false;
            var trimmedId = staffId.Trim();
            if (!string.IsNullOrWhiteSpace(currentStaffId) &&
                string.Equals(trimmedId, currentStaffId.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var nv = await _context.NhanViens
                .Include(n => n.TaiKhoan)
                    .ThenInclude(t => t!.VaiTro)
                .FirstOrDefaultAsync(n => n.MaNhanVien == trimmedId);

            if (nv?.TaiKhoan == null) return false;
            if (nv.TaiKhoan.LaDangHoat &&
                (nv.TaiKhoan.MaVaiTro == "admin" || nv.TaiKhoan.VaiTro?.MaVaiTro == "admin"))
            {
                return false;
            }

            nv.TaiKhoan.LaDangHoat = !nv.TaiKhoan.LaDangHoat;
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
