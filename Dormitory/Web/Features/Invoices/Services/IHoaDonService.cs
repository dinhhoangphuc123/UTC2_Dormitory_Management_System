using Dormitory.Web.Features.Invoices.DTOs;

namespace Dormitory.Web.Features.Invoices.Services
{
    public interface IHoaDonService
    {
        Task<List<InvoiceItemDto>> GetAllInvoicesAsync(string? building = null, string? category = null, string? status = null, string? search = null, string? academicYear = null);
        Task<InvoiceItemDto?> CreateInvoiceAsync(CreateInvoiceDto req, string? academicYear = null);
        Task<bool> ConfirmPaymentAsync(string invoiceId, string paymentMethod, string? academicYear = null);
    }
}
