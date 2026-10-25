using Dormitory.Web.Features.Academic.DTOs;

namespace Dormitory.Web.Features.Academic.Services
{
    public interface ILopHocService
    {
        Task<List<ClassItemDto>> GetAllClassesAsync(string? facultyKey = null, string? cohort = null, string? search = null, string? academicYear = null);
        Task<ClassItemDto> CreateClassAsync(CreateClassDto req);
    }
}

