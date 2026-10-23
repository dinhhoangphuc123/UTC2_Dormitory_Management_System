namespace Dormitory.Web.Features.Staff.DTOs
{
    public class StaffItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string AvatarText { get; set; } = "NV";
        public string LastLogin { get; set; } = "Vừa xong";
        public string Position { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string DepartmentKey { get; set; } = "bql"; // bql, gt, kt, tc, bv
        public string ManagedArea { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = "Ban Quản lý";
        public string RoleKey { get; set; } = "manager"; // admin, manager, operator, viewer
        public string Status { get; set; } = "active"; // active, locked
    }
}
