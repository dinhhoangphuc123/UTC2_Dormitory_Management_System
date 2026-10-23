namespace Dormitory.Web.Features.Reports.DTOs
{
    public class BuildingOperationDto
    {
        public string Name { get; set; } = string.Empty;
        public int Rooms { get; set; }
        public int Beds { get; set; }
        public int Occupied { get; set; }
        public int Vacant { get; set; }
        public double Rate { get; set; }
        public string Revenue { get; set; } = string.Empty;
        public string Status { get; set; } = "Ổn định";
        public string StatusColor { get; set; } = "stable"; // stable, warning, info
    }
}

