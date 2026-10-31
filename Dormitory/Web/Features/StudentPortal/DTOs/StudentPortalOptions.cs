namespace Dormitory.Web.Features.StudentPortal.DTOs
{
    public class StudentPortalOptions
    {
        public const string SectionName = "StudentPortal";

        public string Regulations { get; set; } = string.Empty;
        public string RegistrationGuide { get; set; } = string.Empty;
        public string PaymentGuide { get; set; } = string.Empty;
        public string CheckInOutProcess { get; set; } = string.Empty;
        public string ContactInfo { get; set; } = string.Empty;
    }
}
