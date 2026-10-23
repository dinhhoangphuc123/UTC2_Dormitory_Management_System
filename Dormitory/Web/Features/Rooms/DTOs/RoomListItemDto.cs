namespace Dormitory.Web.Features.Rooms.DTOs
{
    public class RoomListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string BuildingId { get; set; } = string.Empty;
        public string BuildingName { get; set; } = string.Empty;
        public int Floor { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public int Occupied { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string RoomType { get; set; } = string.Empty;
        public decimal PricePerMonth { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<BedItemDto> Beds { get; set; } = new();
    }
}
