namespace Dormitory.Web.Features.Invoices.DTOs
{
    public class CreateInvoiceDto
    {
        public string Room { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = "tonghop";
        public decimal Amount { get; set; }
        public string DueDate { get; set; } = string.Empty;

        // Cho phép lập hóa đơn cho tháng/năm cụ thể; bỏ trống thì dùng tháng hiện tại.
        public int? Month { get; set; }
        public int? Year { get; set; }
    }
}
