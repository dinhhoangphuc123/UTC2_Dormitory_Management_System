namespace Dormitory.Web.Features.Rooms.DTOs
{
    public class BedItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string BedNumber { get; set; } = string.Empty;
        public string? StudentId { get; set; }
        public string? StudentName { get; set; }
        public string? Mssv { get; set; }
        public string Status { get; set; } = "Giường trống";
    }
}
