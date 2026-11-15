namespace Dormitory.Web.Features.Payments.DTOs
{
    public class PaymentOptions
    {
        public const string SectionName = "Payment";

        // Bắt buộc cấu hình trong appsettings; không dùng tài khoản mặc định trong code.
        public string BankId { get; set; } = string.Empty;
        public string AccountNo { get; set; } = string.Empty;
        public string AccountName { get; set; } = string.Empty;
    }
}
