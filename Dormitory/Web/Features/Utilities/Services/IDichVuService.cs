using Dormitory.Web.Features.Utilities.DTOs;

namespace Dormitory.Web.Features.Utilities.Services
{
    public interface IDichVuService
    {
        Task<List<ServiceItemDto>> GetCatalogAsync();
        Task<(bool Success, string? ErrorMessage, ServiceItemDto? Data)> CreateServiceAsync(SaveServiceDto req);
        Task<(bool Success, string? ErrorMessage, ServiceItemDto? Data)> UpdateServiceAsync(string serviceId, SaveServiceDto req);
        Task<(bool Success, string? ErrorMessage)> DeleteServiceAsync(string serviceId);

        Task<List<ServiceRegistrationDto>> GetRegistrationsAsync(string? status, string? academicYear);
        Task<(bool Success, string? ErrorMessage)> ApproveRegistrationAsync(int registrationId, string? staffId);
        Task<(bool Success, string? ErrorMessage)> RejectRegistrationAsync(int registrationId, string? staffId, string? reason);

        Task<(bool Success, string? ErrorMessage, int? RegistrationId)> RegisterServiceForStudentAsync(string studentId, string serviceId,
            int? soLuong = null, string? ngayBatDau = null);
        Task<(bool Success, string? ErrorMessage)> CancelServiceForStudentAsync(string studentId, int registrationId);
        Task<List<StudentServiceOptionDto>> GetStudentServicesAsync(string studentId);
    }
}
