using Dormitory.Web.Features.Registrations.DTOs;

namespace Dormitory.Web.Features.Registrations.Services
{
    public interface IDonDangKyService
    {
        Task<List<ApplicationListItemDto>> GetAllApplicationsAsync(
            string? statusTab = null,
            string? priority = null,
            string? cohort = null,
            string? gender = null,
            string? academicYear = null);

        Task<byte[]> ExportApplicationsExcelAsync(
            string? statusTab = null,
            string? priority = null,
            string? cohort = null,
            string? gender = null,
            string? academicYear = null,
            string? roomType = null,
            string? stayed = null,
            string? search = null);

        Task<ApproveApplicationResult> ApproveApplicationAsync(string applicationId, string? staffId, string? academicYear = null);
        Task<bool> RejectApplicationAsync(string applicationId, string? staffId, string? reason = null, string? academicYear = null);
    }
}
