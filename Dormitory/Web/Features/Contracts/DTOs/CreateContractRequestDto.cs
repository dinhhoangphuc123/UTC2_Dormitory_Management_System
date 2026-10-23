namespace Dormitory.Web.Features.Contracts.DTOs
{
    public class CreateContractRequestDto
    {
        public string StudentName { get; set; } = string.Empty;
        public string Mssv { get; set; } = string.Empty;
        public string RoomNumber { get; set; } = string.Empty;
        public string BedNumber { get; set; } = string.Empty;
        public decimal MonthlyFee { get; set; } = 500000;
        public decimal DepositAmount { get; set; } = 500000;
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
    }
}

