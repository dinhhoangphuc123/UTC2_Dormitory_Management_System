using Dormitory.Web.Features.Academic.DTOs;

namespace Dormitory.Web.Features.Academic.Validators
{
    public static class CreateClassValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(CreateClassDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Code))
                return (false, "Mã lớp không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.Name))
                return (false, "Tên lớp không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.Faculty))
                return (false, "Khoa/viện không được để trống.");

            var cohort = dto.Cohort.Trim();
            if (cohort.Length < 2 ||
                (cohort[0] != 'k' && cohort[0] != 'K') ||
                !int.TryParse(cohort.AsSpan(1), out var cohortNumber) ||
                cohortNumber <= 0)
            {
                return (false, "Khóa học không hợp lệ.");
            }

            return (true, null);
        }
    }
}
