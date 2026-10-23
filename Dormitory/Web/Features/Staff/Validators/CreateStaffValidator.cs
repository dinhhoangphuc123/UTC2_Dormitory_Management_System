using Dormitory.Web.Features.Staff.DTOs;
using Dormitory.Web.Features.Accounts.Enums;

namespace Dormitory.Web.Features.Staff.Validators
{
    public static class CreateStaffValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(CreateStaffDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return (false, "Họ tên không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.Position))
                return (false, "Chức danh không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.Phone))
                return (false, "Số điện thoại không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.Email))
                return (false, "Email không được để trống.");
            if (!dto.Email.Contains("@"))
                return (false, "Email không hợp lệ.");
            if (dto.Role is not (RoleCodes.Admin or RoleCodes.QuanLy or RoleCodes.KeToan))
                return (false, "Vai trò nhân viên không hợp lệ.");
            return (true, null);
        }
    }
}
