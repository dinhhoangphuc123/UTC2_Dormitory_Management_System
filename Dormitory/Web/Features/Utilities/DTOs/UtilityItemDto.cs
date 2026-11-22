namespace Dormitory.Web.Features.Utilities.DTOs
{
    public class UtilityItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public int Floor { get; set; }
        public string Capacity { get; set; } = string.Empty;
        public decimal? OldElectric { get; set; }
        public decimal? NewElectric { get; set; }
        public decimal? UsageElectric { get; set; }
        public decimal? OldWater { get; set; }
        public decimal? NewWater { get; set; }
        public decimal? UsageWater { get; set; }
        public decimal? ElectricityRate { get; set; }
        public decimal? WaterRate { get; set; }
        public List<string> Services { get; set; } = new();
        public List<string> ServiceCodes { get; set; } = new();
        public string Status { get; set; } = "RECORDED"; // RECORDED, PENDING, EXCEEDED
        public string? UpdatedAt { get; set; }

        // Trạng thái chốt hóa đơn điện nước của kỳ gần nhất đã ghi chỉ số
        public string? BillStatus { get; set; } // chuaChot, daChot, null = tháng này chưa lập hóa đơn
        public int? BillThang { get; set; }
        public int? BillNam { get; set; }
        public int? SoNguoiChia { get; set; }
        public decimal? TienMoiNguoi { get; set; }

        // Kỳ đang hiển thị là tháng hiện tại; sang tháng mới chỉ số cũ được giữ làm chỉ số đầu kỳ
        // và trạng thái tự quay về "chờ chốt số".
        public int PeriodMonth { get; set; }
        public int PeriodYear { get; set; }

        // Hóa đơn chờ chốt của tháng trước còn tồn (nếu có) để BQL vẫn chốt bù được.
        public int? PendingBillThang { get; set; }
        public int? PendingBillNam { get; set; }

        // Đã gửi hóa đơn mà sinh viên đã thanh toán hoặc đã nộp minh chứng chờ xác nhận thì khóa chỉnh sửa.
        public bool CanEdit { get; set; } = true;
        public string? LockReason { get; set; }
    }
}
