using System.Text.RegularExpressions;
using Dormitory.Web.Features.StudentPortal.DTOs;
using Microsoft.AspNetCore.Http;

namespace Dormitory.Web.Features.StudentPortal.Validators
{
    public static class UpdateProfileValidator
    {
        private static readonly Regex PhoneRegex = new(@"^(0[3|5|7|8|9])[0-9]{8}$", RegexOptions.Compiled);
        private static readonly Regex EmailRegex = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

        public static (bool IsValid, string? ErrorMessage) Validate(UpdateProfileDto dto)
        {
            if (!string.IsNullOrWhiteSpace(dto.DienThoai))
            {
                var cleanPhone = dto.DienThoai.Trim();
                if (!PhoneRegex.IsMatch(cleanPhone))
                {
                    return (false, "Số điện thoại không đúng định dạng di động Việt Nam (10 chữ số).");
                }
            }

            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                var cleanEmail = dto.Email.Trim();
                if (cleanEmail.Length > 100 || !EmailRegex.IsMatch(cleanEmail))
                {
                    return (false, "Địa chỉ email không đúng định dạng hợp lệ.");
                }
            }

            if (!string.IsNullOrWhiteSpace(dto.DiaChiThuongTru) && dto.DiaChiThuongTru.Trim().Length > 255)
            {
                return (false, "Địa chỉ thường trú không được vượt quá 255 ký tự.");
            }

            return (true, null);
        }
    }

    public static class GuardianValidator
    {
        private static readonly Regex PhoneRegex = new(@"^(0[3|5|7|8|9])[0-9]{8}$", RegexOptions.Compiled);

        public static (bool IsValid, string? ErrorMessage) Validate(CreateGuardianDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.HoTen) || dto.HoTen.Trim().Length > 100)
            {
                return (false, "Họ tên người liên hệ là bắt buộc và tối đa 100 ký tự.");
            }

            var rel = !string.IsNullOrWhiteSpace(dto.QuanHe) ? dto.QuanHe : dto.MoiQuanHe;
            if (string.IsNullOrWhiteSpace(rel) || rel.Trim().Length > 30)
            {
                return (false, "Mối quan hệ là bắt buộc và tối đa 30 ký tự.");
            }

            if (string.IsNullOrWhiteSpace(dto.DienThoai) || !PhoneRegex.IsMatch(dto.DienThoai.Trim()))
            {
                return (false, "Số điện thoại người liên hệ không hợp lệ (10 chữ số).");
            }

            return (true, null);
        }
    }

    public static class ProfileChangeRequestValidator
    {
        private static readonly HashSet<string> AllowedFields = new(StringComparer.OrdinalIgnoreCase)
        {
            "hoTen", "ngaySinh", "gioiTinh", "cccd", "maLop"
        };

        public static (bool IsValid, string? ErrorMessage) Validate(CreateProfileChangeRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Truong) || !AllowedFields.Contains(dto.Truong.Trim()))
            {
                return (false, "Trường thông tin yêu cầu thay đổi không hợp lệ. Chỉ chấp nhận: hoTen, ngaySinh, gioiTinh, cccd, maLop.");
            }

            if (string.IsNullOrWhiteSpace(dto.GiaTriMoi) || dto.GiaTriMoi.Trim().Length > 255)
            {
                return (false, "Giá trị mới là bắt buộc và tối đa 255 ký tự.");
            }

            if (string.IsNullOrWhiteSpace(dto.LyDo) || dto.LyDo.Trim().Length > 255)
            {
                return (false, "Lý do điều chỉnh là bắt buộc và tối đa 255 ký tự.");
            }

            return (true, null);
        }
    }

    public static class ChangePasswordValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(ChangePasswordRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.CurrentPassword))
            {
                return (false, "Vui lòng nhập mật khẩu hiện tại.");
            }

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 8)
            {
                return (false, "Mật khẩu mới phải có ít nhất 8 ký tự.");
            }

            if (dto.NewPassword.Length > 100)
            {
                return (false, "Mật khẩu mới không được vượt quá 100 ký tự.");
            }

            if (dto.NewPassword == dto.CurrentPassword)
            {
                return (false, "Mật khẩu mới phải khác mật khẩu hiện tại.");
            }

            return (true, null);
        }
    }

    public static class SubmitApplicationValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(SubmitApplicationRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.MaDotDangKy))
            {
                return (false, "Vui lòng chọn đợt đăng ký nội trú.");
            }

            if (string.IsNullOrWhiteSpace(dto.MaPhong))
            {
                return (false, "Vui lòng chọn phòng đăng ký.");
            }

            if (!dto.AcceptRules)
            {
                return (false, "Bạn phải đồng ý với nội quy và cam kết của Ký túc xá.");
            }

            return (true, null);
        }
    }

    public static class CreateMaintenanceTicketValidator
    {
        private static readonly byte[] JpegMagic1 = new byte[] { 0xFF, 0xD8, 0xFF };
        private static readonly byte[] PngMagic = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };

        public static (bool IsValid, string? ErrorMessage) Validate(CreateMaintenanceRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.MoTa) || dto.MoTa.Trim().Length > 500)
            {
                return (false, "Mô tả sự cố là bắt buộc và tối đa 500 ký tự.");
            }

            if (!string.IsNullOrWhiteSpace(dto.MucDoKhanCap))
            {
                var level = dto.MucDoKhanCap.Trim();
                if (level != "binhThuong" && level != "khanCap")
                {
                    return (false, "Mức độ khẩn cấp không hợp lệ. Chỉ chấp nhận binhThuong hoặc khanCap.");
                }
            }

            if (!string.IsNullOrWhiteSpace(dto.LoaiSuCo) && dto.LoaiSuCo.Trim().Length > 30)
            {
                return (false, "Loại sự cố không được vượt quá 30 ký tự.");
            }

            if (dto.Image != null)
            {
                if (dto.Image.Length > 2 * 1024 * 1024)
                {
                    return (false, "Kích thước ảnh minh họa tối đa 2MB.");
                }

                var ext = Path.GetExtension(dto.Image.FileName).ToLowerInvariant();
                if (ext != ".jpg" && ext != ".jpeg" && ext != ".png")
                {
                    return (false, "Định dạng ảnh minh họa chỉ chấp nhận JPG hoặc PNG.");
                }

                // Check magic bytes
                using var stream = dto.Image.OpenReadStream();
                byte[] header = new byte[8];
                int read = stream.Read(header, 0, header.Length);
                if (read < 3)
                {
                    return (false, "Tệp ảnh minh họa không hợp lệ.");
                }

                bool isJpeg = header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF;
                bool isPng = read >= 8 && header.Take(8).SequenceEqual(PngMagic);

                if (!isJpeg && !isPng)
                {
                    return (false, "Nội dung tệp ảnh không đúng định dạng JPG/PNG hợp lệ.");
                }
            }

            return (true, null);
        }
    }

    public static class BroadcastNotificationValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(BroadcastNotificationDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.TieuDe) || dto.TieuDe.Trim().Length > 150)
            {
                return (false, "Tiêu đề thông báo là bắt buộc và tối đa 150 ký tự.");
            }

            if (string.IsNullOrWhiteSpace(dto.NoiDung) || dto.NoiDung.Trim().Length > 500)
            {
                return (false, "Nội dung thông báo là bắt buộc và tối đa 500 ký tự.");
            }

            return (true, null);
        }
    }
}
