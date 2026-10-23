using Dormitory.Web.Features.Violations.DTOs;

namespace Dormitory.Web.Features.Violations.Validators
{
    public static class CreateViolationValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(CreateViolationDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.StudentId))
                return (false, "Mã sinh viên không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.ViolationTypeId))
                return (false, "Loại vi phạm không được để trống.");
            if (dto.PenaltyType is not ("remind" or "reprimand" or "warning" or "expel"))
                return (false, "Hình thức xử lý không hợp lệ.");
            if (dto.Notes?.Length > 255)
                return (false, "Ghi chú không được vượt quá 255 ký tự.");
            return (true, null);
        }
    }
}
