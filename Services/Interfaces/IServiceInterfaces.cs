using Quan_ly_Ky_tuc_xa.Models.DTOs;

namespace Quan_ly_Ky_tuc_xa.Services.Interfaces
{
    public interface IAuthService
    {
        Task<UserProfileDto?> AuthenticateAsync(string username, string password);
        Task<UserProfileDto?> GetProfileByUsernameAsync(string username);
    }

    public interface IDashboardService
    {
        Task<DashboardSummaryDto> GetDashboardSummaryAsync();
        Task<bool> ResolveTaskAsync(string taskId);
    }

    public interface ISinhVienService
    {
        Task<List<SinhVienListItemDto>> GetAllStudentsAsync(string? cohort = null, string? major = null, string? status = null, string? search = null);
        Task<SinhVienListItemDto?> GetStudentByIdAsync(string id);
        Task<bool> TransferRoomAsync(string studentId, string newRoomNumber, string newBedNumber);
    }

    public interface IHopDongService
    {
        Task<List<ContractListItemDto>> GetAllContractsAsync(string? statusTab = null, string? building = null, string? search = null);
        Task<ContractListItemDto?> GetContractByIdAsync(string id);
        Task<ContractListItemDto> CreateContractAsync(CreateContractRequestDto req, string staffId);
        Task<bool> RenewContractAsync(string contractId, int months = 5);
        Task<bool> LiquidateContractAsync(string contractId, string? reason = null);
    }

    public interface IDonDangKyService
    {
        Task<List<ApplicationListItemDto>> GetAllApplicationsAsync(string? statusTab = null, string? priority = null, string? cohort = null, string? gender = null);
        Task<bool> ApproveApplicationAsync(string applicationId, string staffId);
        Task<bool> RejectApplicationAsync(string applicationId, string staffId, string? reason = null);
    }

    public interface IPhongService
    {
        Task<List<RoomListItemDto>> GetAllRoomsAsync(string? buildingId = null, int? floor = null, string? status = null, string? search = null);
        Task<bool> ToggleBedMaintenanceAsync(string bedId);
    }
}

