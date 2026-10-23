using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Data;
using Dormitory.Web.Features.Accounts.DTOs;
using Dormitory.Web.Features.Accounts.Mappings;

namespace Dormitory.Web.Features.Accounts.Services
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IPasswordHasher _passwordHasher;

        public AuthService(ApplicationDbContext context, IPasswordHasher passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
        }

        public async Task<UserProfileDto?> LoginAsync(LoginRequestDto request)
        {
            var taiKhoan = await _context.TaiKhoans
                .Include(t => t.VaiTro)
                .Include(t => t.NhanVien)
                .Include(t => t.SinhVien)
                .FirstOrDefaultAsync(t => t.TenDangNhap == request.Username && t.LaDangHoat);

            if (taiKhoan == null)
                return null;

            if (!_passwordHasher.VerifyPassword(request.Password, taiKhoan.MatKhauHash))
                return null;

            // Cập nhật lần đăng nhập cuối
            taiKhoan.LanDangNhapCuoi = DateTime.Now;
            await _context.SaveChangesAsync();

            return taiKhoan.ToUserProfileDto();
        }

        public async Task<UserProfileDto?> AuthenticateAsync(string username, string password)
        {
            return await LoginAsync(new LoginRequestDto { Username = username, Password = password });
        }

        public async Task<UserProfileDto?> GetProfileAsync(string username)
        {
            var taiKhoan = await _context.TaiKhoans
                .Include(t => t.VaiTro)
                .Include(t => t.NhanVien)
                .Include(t => t.SinhVien)
                .FirstOrDefaultAsync(t => t.TenDangNhap == username && t.LaDangHoat);

            if (taiKhoan == null)
                return null;

            return taiKhoan.ToUserProfileDto();
        }
    }
}
