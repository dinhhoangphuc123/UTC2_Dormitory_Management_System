namespace Dormitory.Web.Features.Contracts.DTOs
{
    public class CreateContractRequestDto
    {
        public string Mssv { get; set; } = string.Empty;
        public string BedId { get; set; } = string.Empty;
        public decimal MonthlyFee { get; set; }
        public decimal DepositAmount { get; set; }
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
    }
}
