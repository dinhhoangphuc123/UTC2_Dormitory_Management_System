namespace Dormitory.Web.Features.Dashboard.DTOs
{
    public class RoomTypeStatDto
    {
        public string Name { get; set; } = string.Empty;
        public int RoomCount { get; set; }
        public int OccupiedCount { get; set; }
    }
}
