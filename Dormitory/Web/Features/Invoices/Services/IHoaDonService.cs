using Dormitory.Web.Features.Invoices.DTOs;

namespace Dormitory.Web.Features.Invoices.Services
{
    public interface IHoaDonService
    {
        Task<List<InvoiceItemDto>> GetAllInvoicesAsync(string? building = null, string? category = null, string? status = null, string? search = null);
        Task<InvoiceItemDto> CreateInvoiceAsync(CreateInvoiceDto req);
        Task<bool> ConfirmPaymentAsync(string invoiceId, string paymentMethod);
        Task<int> SendRemindersAsync();
    }
}

