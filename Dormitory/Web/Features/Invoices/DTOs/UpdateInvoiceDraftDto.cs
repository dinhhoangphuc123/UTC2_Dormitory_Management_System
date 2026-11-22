namespace Dormitory.Web.Features.Invoices.DTOs
{
    // Chỉ các trường được phép đổi khi hóa đơn còn là nháp; kỳ và sinh viên giữ nguyên.
    public class UpdateInvoiceDraftDto
    {
        public string Title { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string DueDate { get; set; } = string.Empty;
    }
}
