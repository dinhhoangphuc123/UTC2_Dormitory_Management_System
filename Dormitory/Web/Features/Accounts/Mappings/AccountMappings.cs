using Dormitory.Web.Features.Accounts.DTOs;

namespace Dormitory.Web.Features.Accounts.Mappings
{
    public static class AccountMappings
    {
        public static UserProfileDto ToUserProfileDto(this TaiKhoan taiKhoan)
        {
            var name = "";
            var email = "";
            var phone = "";
            var department = "";

            if (taiKhoan.NhanVien != null)
            {
                name = taiKhoan.NhanVien.HoTen;
                email = taiKhoan.NhanVien.Email ?? "";
                phone = taiKhoan.NhanVien.DienThoai ?? "";
                department = taiKhoan.NhanVien.ChucVu;
            }
            else if (taiKhoan.SinhVien != null)
            {
                name = taiKhoan.SinhVien.HoTen;
                email = taiKhoan.SinhVien.Email ?? "";
                phone = taiKhoan.SinhVien.DienThoai ?? "";
                department = taiKhoan.SinhVien.MaLop;
            }
            else
            {
                name = taiKhoan.TenDangNhap;
            }

            return new UserProfileDto
            {
                Id = taiKhoan.TenDangNhap,
                Username = taiKhoan.TenDangNhap,
                Name = name,
                Role = taiKhoan.VaiTro?.TenVaiTro ?? taiKhoan.MaVaiTro,
                Avatar = "",
                Email = email,
                Phone = phone,
                Department = department
            };
        }
    }
}
