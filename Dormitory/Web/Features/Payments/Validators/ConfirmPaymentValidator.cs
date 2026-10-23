using Dormitory.Web.Features.Payments.DTOs;

namespace Dormitory.Web.Features.Payments.Validators
{
    public static class ConfirmPaymentValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(ConfirmPaymentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.InvoiceId))
                return (false, "Mã hóa đơn không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.PaymentMethod))
                return (false, "Phương thức thanh toán không được để trống.");
            return (true, null);
        }
    }
}

