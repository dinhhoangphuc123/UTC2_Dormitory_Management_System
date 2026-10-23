namespace Dormitory.Web.Features.Invoices.DTOs
{
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
}
