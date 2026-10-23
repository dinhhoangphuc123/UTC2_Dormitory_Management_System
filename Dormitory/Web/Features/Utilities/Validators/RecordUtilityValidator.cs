using Dormitory.Web.Features.Utilities.DTOs;

namespace Dormitory.Web.Features.Utilities.Validators
{
    public static class RecordUtilityValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(RecordUtilityDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.RoomId))
                return (false, "Mã phòng không được để trống.");
            if (dto.NewElectric < 0)
                return (false, "Chỉ số điện không được âm.");
            if (dto.NewWater < 0)
                return (false, "Chỉ số nước không được âm.");
            return (true, null);
        }
    }
}

