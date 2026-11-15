namespace Dormitory.Web.Features.Utilities.DTOs
{
    /// <summary>Kết quả chốt hóa đơn điện nước của một phòng trong một kỳ.</summary>
    public class FinalizeUtilityResultDto
    {
        public string Room { get; set; } = string.Empty;
        public int Thang { get; set; }
        public int Nam { get; set; }
        public int SoNguoiChia { get; set; }
        public decimal TienDienMoiNguoi { get; set; }
        public decimal TienNuocMoiNguoi { get; set; }

        /// <summary>Tổng phí dịch vụ đã duyệt cộng vào hóa đơn của các sinh viên trong phòng kỳ này.</summary>
        public decimal TienDichVu { get; set; }

        /// <summary>Số hóa đơn cá nhân đã tạo mới cho sinh viên.</summary>
        public int InvoicesCreated { get; set; }

        /// <summary>Số sinh viên đã có hóa đơn điện nước kỳ này nên được bỏ qua (chống trùng).</summary>
        public int InvoicesSkipped { get; set; }
    }
}
