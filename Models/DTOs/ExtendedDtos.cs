namespace Quan_ly_Ky_tuc_xa.Models.DTOs
{
    // ==========================================
    // 1. LỚP VÀ KHOA VIỆN DTOs
    // ==========================================
    public class ClassItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Faculty { get; set; } = string.Empty;
        public string FacultyKey { get; set; } = string.Empty; // cntt, ktvt, ck, ktxd, dt, ct
        public string Advisor { get; set; } = string.Empty;
        public string Cohort { get; set; } = string.Empty; // k62, k63, k64, k65
        public int Residents { get; set; }
        public int TotalStudents { get; set; }
        public double Rate { get; set; }
    }

    public class CreateClassDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Faculty { get; set; } = "Khoa Công nghệ thông tin";
        public string FacultyKey { get; set; } = "cntt";
        public string Advisor { get; set; } = string.Empty;
        public string Cohort { get; set; } = "k65";
        public int TotalStudents { get; set; } = 50;
        public int Residents { get; set; } = 25;
    }

    // ==========================================
    // 2. ĐIỆN NƯỚC VÀ DỊCH VỤ DTOs
    // ==========================================
    public class UtilityItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public int Floor { get; set; }
        public string Capacity { get; set; } = string.Empty;
        public int OldElectric { get; set; }
        public int? NewElectric { get; set; }
        public int? UsageElectric { get; set; }
        public int OldWater { get; set; }
        public int? NewWater { get; set; }
        public int? UsageWater { get; set; }
        public List<string> Services { get; set; } = new();
        public string Status { get; set; } = "RECORDED"; // RECORDED, PENDING, EXCEEDED
        public string? UpdatedAt { get; set; }
    }

    public class RecordUtilityDto
    {
        public string RoomId { get; set; } = string.Empty;
        public int NewElectric { get; set; }
        public int NewWater { get; set; }
        public bool HasInternet { get; set; } = true;
        public bool HasTrash { get; set; } = true;
    }

    // ==========================================
    // 3. HÓA ĐƠN VÀ THU PHÍ DTOs
    // ==========================================
    public class InvoiceItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = "tonghop"; // tonghop, phong, diennuoc, guixe
        public string CategoryColor { get; set; } = "#375ba9";
        public decimal Amount { get; set; }
        public string DueDate { get; set; } = string.Empty;
        public bool IsOverdue { get; set; }
        public string? OverdueText { get; set; }
        public string Method { get; set; } = "Chưa có";
        public string MethodIcon { get; set; } = string.Empty;
        public string Status { get; set; } = "pending"; // paid, pending, overdue
        public string StatusLabel { get; set; } = "Chờ nộp";
    }

    public class CreateInvoiceDto
    {
        public string Room { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = "tonghop";
        public decimal Amount { get; set; }
        public string DueDate { get; set; } = string.Empty;
    }

    public class ConfirmPaymentDto
    {
        public string InvoiceId { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = "Tiền mặt (BQL)";
    }

    // ==========================================
    // 4. YÊU CẦU SỬA CHỮA DTOs
    // ==========================================
    public class MaintenanceTicketDto
    {
        public string Id { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public string Category { get; set; } = "Điện dân dụng"; // Điện dân dụng, Nước / Vệ sinh, Khóa cửa / Cửa sổ, Đồ gỗ / Giường tủ, Thiết bị mạng
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Reporter { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Technician { get; set; }
        public string Priority { get; set; } = "Bình thường"; // Khẩn cấp, Bình thường
        public string Status { get; set; } = "PENDING"; // PENDING, IN_PROGRESS, COMPLETED
        public string CreatedAt { get; set; } = string.Empty;
    }

    public class CreateTicketDto
    {
        public string Building { get; set; } = "A2";
        public string Room { get; set; } = string.Empty;
        public string Category { get; set; } = "Điện dân dụng";
        public string Priority { get; set; } = "Bình thường";
        public string Reporter { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class AssignTicketDto
    {
        public string TicketId { get; set; } = string.Empty;
        public string Technician { get; set; } = "Phạm Thành";
        public string Deadline { get; set; } = "Trong ngày hôm nay";
    }

    // ==========================================
    // 5. VI PHẠM VÀ KỶ LUẬT DTOs
    // ==========================================
    public class ViolationRecordDto
    {
        public string Id { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public string Violation { get; set; } = string.Empty;
        public string ViolationType { get; set; } = "cook"; // cook, noise, guest, gambling, electric, smoke
        public string Date { get; set; } = string.Empty;
        public string Penalty { get; set; } = "Khiển trách";
        public string PenaltyType { get; set; } = "reprimand"; // remind, reprimand, warning, expel
        public string Status { get; set; } = "Chờ duyệt"; // Đã thi hành, Đang khiếu nại, Chờ duyệt
        public string Notes { get; set; } = string.Empty;
    }

    public class CreateViolationDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public string Building { get; set; } = "A01";
        public string Violation { get; set; } = string.Empty;
        public string ViolationType { get; set; } = "cook";
        public string Penalty { get; set; } = "Khiển trách";
        public string PenaltyType { get; set; } = "reprimand";
        public string Notes { get; set; } = string.Empty;
    }

    // ==========================================
    // 6. NHÂN VIÊN VÀ TÀI KHOẢN DTOs
    // ==========================================
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
        public string Role { get; set; } = "Ban Quản lý"; // System Admin, Ban Quản lý, Kỹ thuật viên, Chỉ xem (Viewer), Kế toán
        public string RoleKey { get; set; } = "manager"; // admin, manager, operator, viewer
        public string Status { get; set; } = "active"; // active, locked
    }

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

    // ==========================================
    // 7. BÁO CÁO THỐNG KÊ DTOs
    // ==========================================
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

    public class ReportSummaryDto
    {
        public string Semester { get; set; } = "Năm học 2026-2027 · HK1";
        public int TotalRooms { get; set; }
        public int TotalBeds { get; set; }
        public int OccupiedBeds { get; set; }
        public int VacantBeds { get; set; }
        public double OccupancyRate { get; set; }
        public decimal TotalRevenue { get; set; }
        public List<BuildingOperationDto> BuildingOperations { get; set; } = new();
    }
}

