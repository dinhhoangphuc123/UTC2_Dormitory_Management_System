using Microsoft.EntityFrameworkCore;
using Quan_ly_Ky_tuc_xa.Data;
using Quan_ly_Ky_tuc_xa.Models.DTOs;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa.Services.Implementations
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;

        public AuthService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<UserProfileDto?> AuthenticateAsync(string username, string password)
        {
            var user = await _context.TaiKhoans
                .Include(t => t.VaiTro)
                .Include(t => t.NhanVien)
                .Include(t => t.SinhVien)
                .FirstOrDefaultAsync(t => t.TenDangNhap == username.Trim() && t.LaDangHoat);

            if (user == null) return null;

            // Simple password check for demo/academic testing
            if (user.MatKhauHash != password)
            {
                return null;
            }

            user.LanDangNhapCuoi = DateTime.Now;
            await _context.SaveChangesAsync();

            return MapToProfile(user);
        }

        public async Task<UserProfileDto?> GetProfileByUsernameAsync(string username)
        {
            var user = await _context.TaiKhoans
                .Include(t => t.VaiTro)
                .Include(t => t.NhanVien)
                .Include(t => t.SinhVien)
                .FirstOrDefaultAsync(t => t.TenDangNhap == username.Trim());

            return user == null ? null : MapToProfile(user);
        }

        private static UserProfileDto MapToProfile(Models.Entities.TaiKhoan user)
        {
            string name = user.NhanVien?.HoTen ?? user.SinhVien?.HoTen ?? user.TenDangNhap;
            string role = user.MaVaiTro switch
            {
                "quanLy" => "Quản lý",
                "keToan" => "Kế toán",
                "sinhVien" => "Sinh viên",
                _ => user.VaiTro?.TenVaiTro switch
                {
                    "Quản lý KTX" => "Quản lý",
                    "Kế toán" => "Kế toán",
                    "Sinh viên" => "Sinh viên",
                    _ => "Quản trị viên"
                }
            };

            string email = user.NhanVien?.Email ?? user.SinhVien?.Email ?? $"{user.TenDangNhap}@utc2.edu.vn";
            string phone = user.NhanVien?.DienThoai ?? user.SinhVien?.DienThoai ?? "028 3896 6780";
            string department = (user.MaVaiTro == "quanLy" || user.VaiTro?.TenVaiTro == "Quản lý KTX")
                ? "Ban Quản lý Ký túc xá UTC2"
                : (user.MaVaiTro == "keToan" || user.VaiTro?.TenVaiTro == "Kế toán")
                ? "Phòng Tài chính - Kế toán"
                : (user.MaVaiTro == "sinhVien" || user.VaiTro?.TenVaiTro == "Sinh viên")
                ? "Khoa Công nghệ Thông tin - K64"
                : "Trung tâm CNTT & Truyền thông";

            // Avatar URLs from official demo
            string avatar = user.TenDangNhap switch
            {
                "ql_an" => "https://lh3.googleusercontent.com/aida/AEtjO1VEg_e1KgZL29_UWGSHe9LkzfHL711XB560TIZqL2TwwsGUBBut-lF6cxcEoWyjlxbNQUeKZqNz4jPERNeEl7tWfPjEtMxJf226DAUWSDXJgEJ-sGieFawrPt7uD671U48KZ1uZDHe51aXOhRjnHf1PigfQIbDmVGVkxSTtxjkoEMXvkEjZfFmox3lvMhXiEGDOJ3UhUXJvYHEoEmFoJREvVl7UKvK0kjkVaJzhE37UquQkN1i40Kr-xx4f3irijoWB1s6GtYv9qQ",
                "kt_binh" => "https://lh3.googleusercontent.com/aida-public/AB6AXuCRsf2rzUdPmUBcqeo3clXQmmUOVjlSYmRHa5QRXjO_LCi9uZn5EslcwqYYODi5SLw19YpM4odqJdPBdN2A0YYPr9EHigx0G8X6JwR0Vh1IZ-UBicPl5P2TnyaImIt4dtY1EmQdaxJsbCoeaWj4lHkHW--ax-jlLtdpr94lKuoruI58KzGhoDBAsURGTPKb2axlA5wtBUloF-_45sTmZ0c4VbcCkr-HRFsBWfzLaYBY5X5-RZF9MRkH5g",
                "sv_minh" => "https://lh3.googleusercontent.com/aida-public/AB6AXuApy05bQf0n4X_3prqg9yRnz1Up26ewX2j1XKbV6Xt4a-hJZehP0j72pEsQwNuUzh_nPoWXQGNOgFkC2Me0lALOeEj0dQADljvkwQMdtiZQzuASphPArI_NMYnujwIu8_vxfXfLlucOEC-ZSM50VINW56baL0PSL5VAHyQNPkgrhhNC18YFXZgdM9I51O-AR2Xn0aYBoy4fwCLeh5tLezRdOv5KlpxttMInEo_NnrWTT7t_2jRPIDcxwQ",
                _ => "https://lh3.googleusercontent.com/aida-public/AB6AXuBtq_LznPIQ3xIBcgoQeT3IOWgpOdcva7my9n7clj71DOufs5q6iu1L8SiooIKZR2FB69oInVqfS8XCO8MehA4W4X3I3HQ02GDFC3Zc71DqI-yAZL7jzEOZJr14cnVmAJF8lQyN5uUa-j-RBHrgwvhVnPIBdRCKvVj80-VMYRq-i8KuCIqgrBj2K-qvBJM4O9hsJZBrLT-_dkaHqLZ811d9JMCCBJMbuoABDWPcN9aUqT-RGtr9Ps-6ww"
            };

            return new UserProfileDto
            {
                Id = user.TenDangNhap,
                Username = user.TenDangNhap,
                Name = name,
                Role = role,
                Avatar = avatar,
                Email = email,
                Phone = phone,
                Department = department
            };
        }
    }
}
