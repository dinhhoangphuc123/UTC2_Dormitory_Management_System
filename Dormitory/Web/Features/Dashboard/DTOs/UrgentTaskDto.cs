namespace Dormitory.Web.Features.Dashboard.DTOs
{
    public class UrgentTaskDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Subtitle { get; set; } = string.Empty;
        public string Tag { get; set; } = string.Empty;
        public string TagType { get; set; } = "primary";
        public string Icon { get; set; } = "info";
        public string ActionText { get; set; } = "Xử lý";
        public string Type { get; set; } = "application";
        public bool Completed { get; set; } = false;
    }
}

