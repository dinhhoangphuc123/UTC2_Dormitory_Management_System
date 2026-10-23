using Dormitory.Web.Features.Contracts.DTOs;

namespace Dormitory.Web.Features.Contracts.Validators
{
    public static class CreateContractValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(CreateContractRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.StudentName))
                return (false, "Tên sinh viên không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.Mssv))
                return (false, "Mã số sinh viên không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.RoomNumber))
                return (false, "Mã phòng không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.BedNumber))
                return (false, "Mã giường không được để trống.");
            if (dto.MonthlyFee <= 0)
                return (false, "Giá thuê tháng phải lớn hơn 0.");
            if (dto.DepositAmount < 0)
                return (false, "Tiền cọc không được âm.");
            return (true, null);
        }
    }
}

