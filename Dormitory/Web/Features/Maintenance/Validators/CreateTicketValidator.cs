using Dormitory.Web.Features.Maintenance.DTOs;

namespace Dormitory.Web.Features.Maintenance.Validators
{
    public static class CreateTicketValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(CreateTicketDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.StudentId))
                return (false, "Mã sinh viên không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.Description))
                return (false, "Mô tả sự cố không được để trống.");
            if (dto.Description.Trim().Length > 500)
                return (false, "Mô tả sự cố không được vượt quá 500 ký tự.");
            return (true, null);
        }
    }
}
