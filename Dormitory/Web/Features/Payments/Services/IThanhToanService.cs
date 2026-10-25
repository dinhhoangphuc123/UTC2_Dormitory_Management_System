using Dormitory.Web.Features.Payments.DTOs;

namespace Dormitory.Web.Features.Payments.Services
{
    public interface IThanhToanService
    {
        Task<bool> ProcessPaymentAsync(ConfirmPaymentDto req, string? academicYear = null);
        Task<decimal> GetTotalRevenueAsync(string? academicYear = null);
    }
}

