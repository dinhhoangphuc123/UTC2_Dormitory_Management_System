using System.IO;
using System.Text;
using Dormitory.Web.Features.StudentPortal.DTOs;
using Dormitory.Web.Features.StudentPortal.Validators;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace Dormitory.UnitTests.Features.StudentPortal
{
    public class StudentPortalValidatorsTests
    {
        [Theory]
        [InlineData("0903123456", true)]
        [InlineData("0389998888", true)]
        [InlineData("12345", false)]
        [InlineData("0123456789", false)]
        public void UpdateProfileValidator_PhoneCheck(string phone, bool expectedValid)
        {
            var dto = new UpdateProfileDto { DienThoai = phone };
            var (isValid, _) = UpdateProfileValidator.Validate(dto);
            Assert.Equal(expectedValid, isValid);
        }

        [Theory]
        [InlineData("test@utc2.edu.vn", true)]
        [InlineData("invalid-email", false)]
        public void UpdateProfileValidator_EmailCheck(string email, bool expectedValid)
        {
            var dto = new UpdateProfileDto { Email = email };
            var (isValid, _) = UpdateProfileValidator.Validate(dto);
            Assert.Equal(expectedValid, isValid);
        }

        [Theory]
        [InlineData("hoTen", true)]
        [InlineData("ngaySinh", true)]
        [InlineData("gioiTinh", true)]
        [InlineData("cccd", true)]
        [InlineData("maLop", true)]
        [InlineData("tienCoc", false)]
        [InlineData("trangThai", false)]
        public void ProfileChangeRequestValidator_Fields(string field, bool expectedValid)
        {
            var dto = new CreateProfileChangeRequestDto
            {
                Truong = field,
                GiaTriMoi = "Giá trị mới",
                LyDo = "Lý do cập nhật"
            };
            var (isValid, _) = ProfileChangeRequestValidator.Validate(dto);
            Assert.Equal(expectedValid, isValid);
        }

        [Fact]
        public void ChangePasswordValidator_FailsWhenSamePasswordOrTooShort()
        {
            var shortDto = new ChangePasswordRequestDto
            {
                CurrentPassword = "Password123@",
                NewPassword = "short"
            };
            var (valid1, _) = ChangePasswordValidator.Validate(shortDto);
            Assert.False(valid1);

            var sameDto = new ChangePasswordRequestDto
            {
                CurrentPassword = "Password123@",
                NewPassword = "Password123@"
            };
            var (valid2, _) = ChangePasswordValidator.Validate(sameDto);
            Assert.False(valid2);
        }

        [Fact]
        public void SubmitApplicationValidator_RequiresAcceptRules()
        {
            var dto = new SubmitApplicationRequestDto
            {
                MaDotDangKy = "DOT01",
                MaPhong = "A101",
                AcceptRules = false
            };
            var (isValid, err) = SubmitApplicationValidator.Validate(dto);
            Assert.False(isValid);
            Assert.Contains("đồng ý", err);

            dto.AcceptRules = true;
            var (validOk, _) = SubmitApplicationValidator.Validate(dto);
            Assert.True(validOk);
        }

        [Fact]
        public void CreateMaintenanceTicketValidator_FailsWhenDescriptionTooLong()
        {
            var dto = new CreateMaintenanceRequestDto
            {
                MoTa = new string('a', 501)
            };
            var (isValid, _) = CreateMaintenanceTicketValidator.Validate(dto);
            Assert.False(isValid);
        }

        [Fact]
        public void CreateMaintenanceTicketValidator_ChecksMagicBytes()
        {
            // Fake JPEG with bad magic bytes
            var fakeContent = Encoding.UTF8.GetBytes("not-an-image-content");
            var stream = new MemoryStream(fakeContent);
            var formFile = new FormFile(stream, 0, fakeContent.Length, "image", "test.jpg");

            var dto = new CreateMaintenanceRequestDto
            {
                MoTa = "Bóng đèn bị hỏng",
                Image = formFile
            };

            var (isValid, err) = CreateMaintenanceTicketValidator.Validate(dto);
            Assert.False(isValid);
            Assert.Contains("định dạng", err);
        }

        [Fact]
        public void CreateMaintenanceTicketValidator_AcceptsValidJpegMagicBytes()
        {
            // Valid JPEG header FF D8 FF E0
            var jpegHeader = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46 };
            var stream = new MemoryStream(jpegHeader);
            var formFile = new FormFile(stream, 0, jpegHeader.Length, "image", "photo.jpeg");

            var dto = new CreateMaintenanceRequestDto
            {
                MoTa = "Vòi nước bị rò rỉ",
                Image = formFile
            };

            var (isValid, _) = CreateMaintenanceTicketValidator.Validate(dto);
            Assert.True(isValid);
        }

        [Fact]
        public void GuardianValidator_ValidatesNameAndPhone()
        {
            var invalid = new CreateGuardianDto
            {
                HoTen = "",
                QuanHe = "Bố",
                DienThoai = "12345"
            };
            var (valid1, _) = GuardianValidator.Validate(invalid);
            Assert.False(valid1);

            var valid = new CreateGuardianDto
            {
                HoTen = "Nguyễn Văn A",
                QuanHe = "Bố",
                DienThoai = "0987654321"
            };
            var (valid2, _) = GuardianValidator.Validate(valid);
            Assert.True(valid2);
        }

        [Fact]
        public void BroadcastNotificationValidator_ValidatesTitleAndContent()
        {
            var invalid = new BroadcastNotificationDto
            {
                TieuDe = "",
                NoiDung = ""
            };
            var (valid1, _) = BroadcastNotificationValidator.Validate(invalid);
            Assert.False(valid1);

            var valid = new BroadcastNotificationDto
            {
                TieuDe = "Thông báo lịch cắt điện",
                NoiDung = "Ký túc xá sẽ bảo trì điện từ 8h đến 11h sáng mai."
            };
            var (valid2, _) = BroadcastNotificationValidator.Validate(valid);
            Assert.True(valid2);
        }
    }
}
