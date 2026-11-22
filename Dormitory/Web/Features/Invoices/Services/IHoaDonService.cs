using Dormitory.Web.Features.Invoices.DTOs;

namespace Dormitory.Web.Features.Invoices.Services
{
    public interface IHoaDonService
    {
        Task<List<InvoiceItemDto>> GetAllInvoicesAsync(string? building = null, string? category = null, string? status = null, string? search = null, string? academicYear = null);
        Task<InvoiceItemDto?> CreateInvoiceAsync(CreateInvoiceDto req, string? academicYear = null);
        Task<(bool Success, string? ErrorMessage)> UpdateDraftInvoiceAsync(string invoiceId, UpdateInvoiceDraftDto req,
            string? academicYear = null);
        Task<bool> SendInvoiceAsync(string invoiceId, string? academicYear = null);
        Task<bool> ConfirmPaymentAsync(string invoiceId, string paymentMethod, string? academicYear = null, string? staffId = null,
            Microsoft.AspNetCore.Http.IFormFile? proofFile = null, string? appDataPath = null);
        Task<(bool Success, string? ErrorMessage)> SubmitPaymentProofAsync(string invoiceId, string studentId,
            Microsoft.AspNetCore.Http.IFormFile? proofFile, string appDataPath);
        Task<(bool Success, string? ErrorMessage)> RejectPaymentProofAsync(string invoiceId, string? reason,
            string? academicYear = null, string? staffId = null);
        Task<(byte[]? FileBytes, string? ContentType)> GetInvoiceProofAsync(string invoiceId, string? studentId = null, string? appDataPath = null);
        Task<(byte[]? FileBytes, string? ContentType)> GetPaymentProofAsync(string paymentId, string? appDataPath = null);
    }
}
