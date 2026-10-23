namespace Dormitory.Web.Features.Payments.DTOs
{
    public class ConfirmPaymentDto
    {
        public string InvoiceId { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = "Tiền mặt (BQL)";
        public decimal Amount { get; set; }
        public string? Note { get; set; }
    }
}

