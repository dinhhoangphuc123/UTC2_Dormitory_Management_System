namespace Dormitory.Web.Features.Utilities.DTOs
{
    public class UtilityItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public int Floor { get; set; }
        public string Capacity { get; set; } = string.Empty;
        public int OldElectric { get; set; }
        public int? NewElectric { get; set; }
        public int? UsageElectric { get; set; }
        public int OldWater { get; set; }
        public int? NewWater { get; set; }
        public int? UsageWater { get; set; }
        public List<string> Services { get; set; } = new();
        public string Status { get; set; } = "RECORDED"; // RECORDED, PENDING, EXCEEDED
        public string? UpdatedAt { get; set; }
    }
}
