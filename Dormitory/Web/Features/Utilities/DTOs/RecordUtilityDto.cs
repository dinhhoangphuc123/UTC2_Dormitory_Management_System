namespace Dormitory.Web.Features.Utilities.DTOs
{
    public class RecordUtilityDto
    {
        public string RoomId { get; set; } = string.Empty;
        public int NewElectric { get; set; }
        public int NewWater { get; set; }
        public bool HasInternet { get; set; } = true;
        public bool HasTrash { get; set; } = true;
    }
}

