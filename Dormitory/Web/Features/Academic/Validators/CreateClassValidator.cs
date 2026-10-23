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
            if (dto.TotalStudents < 0)
                return (false, "Tổng số sinh viên không được âm.");
            if (dto.Residents < 0 || dto.Residents > dto.TotalStudents)
                return (false, "Số sinh viên nội trú không hợp lệ.");
            return (true, null);
        }
    }
}

