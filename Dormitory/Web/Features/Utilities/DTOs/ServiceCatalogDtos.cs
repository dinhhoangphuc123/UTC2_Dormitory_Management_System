namespace Dormitory.Web.Features.Utilities.DTOs
{
    public class ServiceItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public bool IsActive { get; set; }
        public int ActiveRegistrations { get; set; }
    }

    public class SaveServiceDto
    {
        public string Name { get; set; } = string.Empty;
        public string Unit { get; set; } = "thang";
        public decimal Price { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class ServiceRegistrationDto
    {
        public int Id { get; set; }
        public string ServiceId { get; set; } = string.Empty;
        public string ServiceName { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public int SoLuong { get; set; }
        public string NgayBatDau { get; set; } = string.Empty;
        public string? NgayKetThuc { get; set; }
        public string TrangThai { get; set; } = string.Empty;
        public string? StaffApprovedBy { get; set; }
        public string? NgayDuyet { get; set; }
        public string? RejectReason { get; set; }
    }

    public class RejectServiceRegistrationDto
    {
        public string? Reason { get; set; }
    }

    // Một dòng cho tab Dịch vụ của sinh viên: dịch vụ trong danh mục + đơn hiện tại của mình (nếu có).
    public class StudentServiceOptionDto
    {
        public string ServiceId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int? RegistrationId { get; set; }
        public string? Status { get; set; }
        public int? SoLuong { get; set; }
        public string? NgayBatDau { get; set; }
        public string? LyDoTuChoi { get; set; }
    }
}
