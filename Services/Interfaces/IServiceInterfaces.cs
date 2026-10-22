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

    public interface ILopHocService
    {
        Task<List<ClassItemDto>> GetAllClassesAsync(string? facultyKey = null, string? cohort = null, string? search = null);
        Task<ClassItemDto> CreateClassAsync(CreateClassDto req);
    }

    public interface IDienNuocDichVuService
    {
        Task<List<UtilityItemDto>> GetAllUtilitiesAsync(string? building = null, int? floor = null, string? status = null, string? search = null);
        Task<UtilityItemDto?> RecordUtilityAsync(RecordUtilityDto req);
    }

    public interface IHoaDonService
    {
        Task<List<InvoiceItemDto>> GetAllInvoicesAsync(string? building = null, string? category = null, string? status = null, string? search = null);
        Task<InvoiceItemDto> CreateInvoiceAsync(CreateInvoiceDto req);
        Task<bool> ConfirmPaymentAsync(ConfirmPaymentDto req);
        Task<int> SendRemindersAsync();
    }

    public interface IYeuCauSuaChuaService
    {
        Task<List<MaintenanceTicketDto>> GetAllTicketsAsync(string? building = null, string? category = null, string? priority = null, string? status = null, string? search = null);
        Task<MaintenanceTicketDto> CreateTicketAsync(CreateTicketDto req);
        Task<bool> AssignTicketAsync(AssignTicketDto req);
        Task<bool> CompleteTicketAsync(string ticketId);
    }

    public interface IViPhamService
    {
        Task<List<ViolationRecordDto>> GetAllViolationsAsync(string? building = null, string? penaltyType = null, string? violationType = null, string? search = null);
        Task<ViolationRecordDto> CreateViolationAsync(CreateViolationDto req);
        Task<bool> CloseViolationAsync(string violationId);
    }

    public interface INhanVienService
    {
        Task<List<StaffItemDto>> GetAllStaffAsync(string? deptKey = null, string? roleKey = null, string? status = null, string? search = null);
        Task<StaffItemDto> CreateStaffAsync(CreateStaffDto req);
        Task<bool> ToggleStaffStatusAsync(string staffId);
    }

    public interface IBaoCaoService
    {
        Task<ReportSummaryDto> GetReportSummaryAsync(string? semester = null, string? scope = null);
    }
}

