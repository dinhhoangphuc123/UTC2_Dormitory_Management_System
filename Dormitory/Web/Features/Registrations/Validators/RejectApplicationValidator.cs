using Dormitory.Web.Features.Registrations.DTOs;

namespace Dormitory.Web.Features.Registrations.Validators
{
    public static class RejectApplicationValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(RejectApplicationDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.ApplicationId))
                return (false, "Mã đơn đăng ký không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.Reason))
                return (false, "Vui lòng nhập lý do từ chối đơn đăng ký.");
            return (true, null);
        }
    }
}

