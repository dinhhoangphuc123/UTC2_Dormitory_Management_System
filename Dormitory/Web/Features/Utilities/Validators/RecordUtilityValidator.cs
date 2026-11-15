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
            if (dto.Thang.HasValue && dto.Thang.Value is < 1 or > 12)
                return (false, "Tháng phải nằm trong khoảng 1 đến 12.");
            if (dto.Nam.HasValue && dto.Nam.Value is < 2000 or > 2100)
                return (false, "Năm không hợp lệ.");
            if (dto.Thang.HasValue != dto.Nam.HasValue)
                return (false, "Vui lòng nhập đầy đủ cả tháng và năm.");
            return (true, null);
        }
    }
}
