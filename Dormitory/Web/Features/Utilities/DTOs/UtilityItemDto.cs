namespace Dormitory.Web.Features.Utilities.DTOs
{
    public class UtilityItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public int Floor { get; set; }
        public string Capacity { get; set; } = string.Empty;
        public decimal? OldElectric { get; set; }
        public decimal? NewElectric { get; set; }
        public decimal? UsageElectric { get; set; }
        public decimal? OldWater { get; set; }
        public decimal? NewWater { get; set; }
        public decimal? UsageWater { get; set; }
        public decimal? ElectricityRate { get; set; }
        public decimal? WaterRate { get; set; }
        public List<string> Services { get; set; } = new();
        public string Status { get; set; } = "RECORDED"; // RECORDED, PENDING, EXCEEDED
        public string? UpdatedAt { get; set; }
    }
}
