using Dormitory.Web.Features.Maintenance.DTOs;

namespace Dormitory.Web.Features.Maintenance.Validators
{
    public static class CreateTicketValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(CreateTicketDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Room))
                return (false, "Phòng không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.Description))
                return (false, "Mô tả sự cố không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.Reporter))
                return (false, "Người báo sự cố không được để trống.");
            return (true, null);
        }
    }
}

