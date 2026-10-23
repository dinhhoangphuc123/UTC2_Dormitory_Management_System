using Dormitory.Web.Features.Contracts.DTOs;

namespace Dormitory.Web.Features.Contracts.Validators
{
    public static class CreateContractValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(CreateContractRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Mssv))
                return (false, "Mã số sinh viên không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.BedId))
                return (false, "Mã giường không được để trống.");
            if (dto.MonthlyFee <= 0)
                return (false, "Giá thuê tháng phải lớn hơn 0.");
            if (dto.DepositAmount < 0)
                return (false, "Tiền cọc không được âm.");
            if (!DateTime.TryParseExact(dto.StartDate, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var start))
                return (false, "Ngày bắt đầu không hợp lệ.");
            if (!DateTime.TryParseExact(dto.EndDate, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var end) || end <= start)
                return (false, "Ngày kết thúc phải sau ngày bắt đầu.");
            return (true, null);
        }
    }
}
