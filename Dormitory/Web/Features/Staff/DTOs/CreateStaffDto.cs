namespace Dormitory.Web.Features.Staff.DTOs
{
    public class CreateStaffDto
    {
        public string Name { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string Department { get; set; } = "Tổ Giám thị & Sinh viên";
        public string DepartmentKey { get; set; } = "gt";
        public string ManagedArea { get; set; } = "Tòa A01 & A02";
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = "Ban Quản lý";
    }
}

