namespace Dormitory.Web.Features.Dashboard.DTOs
{
    public class ZoneOccupancyDto
    {
        public string ZoneName { get; set; } = string.Empty;
        public int Occupied { get; set; }
        public int Total { get; set; }
        public double Percent { get; set; }
    }
}

