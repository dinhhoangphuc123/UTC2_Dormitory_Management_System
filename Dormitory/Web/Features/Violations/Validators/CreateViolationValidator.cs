using Dormitory.Web.Features.Violations.DTOs;

namespace Dormitory.Web.Features.Violations.Validators
{
    public static class CreateViolationValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(CreateViolationDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.StudentId))
                return (false, "Mã sinh viên không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.Violation))
                return (false, "Hành vi vi phạm không được để trống.");
            return (true, null);
        }
    }
}

