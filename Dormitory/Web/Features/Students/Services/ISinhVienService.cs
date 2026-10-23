using Dormitory.Web.Features.Students.DTOs;

namespace Dormitory.Web.Features.Students.Services
{
    public interface ISinhVienService
    {
        Task<List<SinhVienListItemDto>> GetAllStudentsAsync(string? cohort = null, string? major = null, string? status = null, string? search = null);
        Task<SinhVienListItemDto?> GetStudentByIdAsync(string id);
        Task<bool> TransferRoomAsync(string studentId, string newRoomNumber, string newBedNumber);
    }
}

