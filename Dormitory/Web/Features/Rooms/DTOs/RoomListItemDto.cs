namespace Dormitory.Web.Features.Rooms.DTOs
{
    public class RoomListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string BuildingId { get; set; } = string.Empty;
        public string BuildingName { get; set; } = string.Empty;
        public int Floor { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public int Capacity { get; set; } = 8;
        public int Occupied { get; set; }
        public string Gender { get; set; } = "Nam";
        public string RoomType { get; set; } = "Tiêu chuẩn";
        public decimal PricePerMonth { get; set; } = 500000;
        public string Status { get; set; } = "Còn chỗ";
        public List<BedItemDto> Beds { get; set; } = new();
    }
}
