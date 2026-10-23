namespace Dormitory.Web.Features.Buildings.DTOs
{
    public class BuildingItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int Floors { get; set; }
        public string GenderAllowed { get; set; } = "nam";
        public string Status { get; set; } = "hoatDong";
        public int TotalRooms { get; set; }
        public int TotalBeds { get; set; }
    }
}

