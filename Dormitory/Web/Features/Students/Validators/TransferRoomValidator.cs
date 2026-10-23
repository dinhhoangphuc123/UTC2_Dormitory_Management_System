using Dormitory.Web.Features.Students.DTOs;

namespace Dormitory.Web.Features.Students.Validators
{
    public static class TransferRoomValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(TransferRoomDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.StudentId))
                return (false, "Mã sinh viên không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.NewRoomNumber))
                return (false, "Mã phòng mới không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.NewBedNumber))
                return (false, "Mã giường mới không được để trống.");
            return (true, null);
        }
    }
}

