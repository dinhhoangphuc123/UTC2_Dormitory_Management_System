using Dormitory.Web.Features.Staff.DTOs;

namespace Dormitory.Web.Features.Staff.Validators
{
    public static class CreateStaffValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(CreateStaffDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return (false, "Họ tên không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.Phone))
                return (false, "Số điện thoại không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.Email))
                return (false, "Email không được để trống.");
            if (!dto.Email.Contains("@"))
                return (false, "Email không hợp lệ.");
            return (true, null);
        }
    }
}

