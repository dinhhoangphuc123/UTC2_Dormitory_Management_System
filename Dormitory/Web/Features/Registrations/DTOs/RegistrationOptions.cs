namespace Dormitory.Web.Features.Registrations.DTOs
{
    public class RegistrationOptions
    {
        public const string SectionName = "Registration";

        public int HoldHours { get; set; } = 24;
        public int InitialPaymentMonths { get; set; } = 1;
        public decimal DepositAmount { get; set; } = 0;
    }
}
