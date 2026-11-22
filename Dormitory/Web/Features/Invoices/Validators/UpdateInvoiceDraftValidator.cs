using Dormitory.Web.Features.Invoices.DTOs;

namespace Dormitory.Web.Features.Invoices.Validators
{
    public static class UpdateInvoiceDraftValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(UpdateInvoiceDraftDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
                return (false, "Tiêu đề hóa đơn không được để trống.");
            if (dto.Title.Trim().Length > 100)
                return (false, "Tiêu đề hóa đơn không được vượt quá 100 ký tự.");
            if (dto.Amount <= 0)
                return (false, "Số tiền phải lớn hơn 0.");
            if (!DateTime.TryParseExact(
                    dto.DueDate,
                    new[] { "dd/MM/yyyy", "yyyy-MM-dd" },
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None,
                    out _))
                return (false, "Hạn thanh toán không hợp lệ.");
            return (true, null);
        }
    }
}
