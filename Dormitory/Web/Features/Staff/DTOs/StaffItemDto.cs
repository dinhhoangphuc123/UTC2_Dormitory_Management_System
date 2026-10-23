namespace Dormitory.Web.Features.Staff.DTOs
{
    public class StaffItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string AvatarText { get; set; } = "NV";
        public string LastLogin { get; set; } = "Chưa đăng nhập";
        public string Position { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string DepartmentKey { get; set; } = "other";
        public string ManagedArea { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = "Chưa phân quyền";
        public string RoleKey { get; set; } = "other";
        public string Status { get; set; } = "active"; // active, locked
    }
}
