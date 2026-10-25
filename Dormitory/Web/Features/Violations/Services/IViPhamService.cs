using Dormitory.Web.Features.Violations.DTOs;

namespace Dormitory.Web.Features.Violations.Services
{
    public interface IViPhamService
    {
        Task<List<ViolationRecordDto>> GetAllViolationsAsync(string? building = null, string? penaltyType = null, string? violationType = null, string? search = null, string? academicYear = null);
        Task<List<ViolationTypeOptionDto>> GetViolationTypesAsync(string? academicYear = null);
        Task<ViolationRecordDto?> CreateViolationAsync(CreateViolationDto req, string? academicYear = null);
    }
}
