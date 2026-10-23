namespace Dormitory.Web.Features.Staff.DTOs
{
    public class CreateStaffDto
    {
        public string Name { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }
}
