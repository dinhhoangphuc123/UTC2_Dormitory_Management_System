using Dormitory.Web.Features.Students.DTOs;

namespace Dormitory.Web.Features.Students.Services
{
    public interface ISinhVienService
    {
        Task<List<SinhVienListItemDto>> GetAllStudentsAsync(string? cohort = null, string? major = null, string? status = null, string? search = null, string? academicYear = null, int page = 1, int pageSize = 50);
        Task<SinhVienListItemDto?> GetStudentByIdAsync(string id, string? academicYear = null);
    }
}

