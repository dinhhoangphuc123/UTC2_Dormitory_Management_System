namespace Dormitory.Web.Features.Invoices.DTOs
{
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
}

