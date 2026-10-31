namespace Dormitory.Web.Features.Payments.DTOs
{
    public class PaymentOptions
    {
        public const string SectionName = "Payment";

        public string BankId { get; set; } = "VietinBank";
        public string AccountNo { get; set; } = "102800000001";
        public string AccountName { get; set; } = "KTX TRUONG DH GTVT PHAN HIEU TAI TP.HCM";
    }
}
