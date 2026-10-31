using Dormitory.Web.Features.StudentPortal.DTOs;

namespace Dormitory.Web.Features.StudentPortal.Services
{
    public interface IStudentPortalService
    {
        // 1. Dashboard
        Task<StudentDashboardDto?> GetDashboardAsync(string studentId);

        // 2. Profile & Guardians & Request
        Task<StudentProfileDto?> GetProfileAsync(string studentId);
        Task<bool> UpdateProfileAsync(string studentId, UpdateProfileDto dto);
        Task<List<GuardianDto>> GetGuardiansAsync(string studentId);
        Task<(bool Success, string? ErrorMessage)> AddGuardianAsync(string studentId, CreateGuardianDto dto);
        Task<bool> UpdateGuardianAsync(string studentId, string guardianId, CreateGuardianDto dto);
        Task<bool> DeleteGuardianAsync(string studentId, string guardianId);
        Task<List<ProfileChangeRequestDto>> GetProfileChangeRequestsAsync(string studentId);
        Task<bool> CreateProfileChangeRequestAsync(string studentId, CreateProfileChangeRequestDto dto);
        Task<(bool Success, string? ErrorMessage)> ChangePasswordAsync(string studentId, string currentPassword, string newPassword);

        // 3. Rounds, Buildings, Rooms
        Task<List<RegistrationRoundDto>> GetRoundsAsync(string studentId);
        Task<List<StudentBuildingDto>> GetBuildingsForRoundAsync(string studentId, string roundId);
        Task<List<StudentRoomDto>> GetRoomsForRoundAsync(string studentId, string roundId, string? buildingId);

        // 4. Applications
        Task<(bool Success, string? ErrorMessage, string? ApplicationId, int StatusCode)> SubmitApplicationAsync(string studentId, SubmitApplicationRequestDto req);
        Task<List<StudentApplicationDto>> GetApplicationsAsync(string studentId);
        Task<StudentApplicationDto?> GetApplicationByIdAsync(string studentId, string applicationId);
        Task<ApplicationPaymentInfoDto?> GetApplicationPaymentInfoAsync(string studentId, string applicationId);

        // 5. Contracts
        Task<List<StudentContractDto>> GetContractsAsync(string studentId);
        Task<StudentContractDto?> GetContractByIdAsync(string studentId, string contractId);

        // 6. Invoices & Utilities
        Task<List<StudentInvoiceListItemDto>> GetInvoicesAsync(string studentId, string? status = null, string? type = null);
        Task<StudentInvoiceDetailDto?> GetInvoiceByIdAsync(string studentId, string invoiceId);
        Task<StudentUtilityDto?> GetUtilitiesAsync(string studentId);

        // 7. Maintenance
        Task<List<StudentMaintenanceDto>> GetMaintenanceTicketsAsync(string studentId);
        Task<StudentMaintenanceDto?> GetMaintenanceTicketByIdAsync(string studentId, int id);
        Task<(bool Success, string? ErrorMessage, int StatusCode)> CreateMaintenanceTicketAsync(string studentId, CreateMaintenanceRequestDto req, string appDataPath);
        Task<(byte[]? FileBytes, string? ContentType)> GetMaintenanceImageAsync(string studentId, int id, string appDataPath);

        // 8. Violations
        Task<List<StudentViolationDto>> GetViolationsAsync(string studentId);

        // 9. Notifications
        Task<List<StudentNotificationDto>> GetNotificationsAsync(string studentId, bool unreadOnly = false);
        Task<int> GetUnreadNotificationCountAsync(string studentId);
        Task<bool> MarkNotificationAsReadAsync(string studentId, int notificationId);
        Task<bool> MarkAllNotificationsAsReadAsync(string studentId);
        Task<int> BroadcastNotificationAsync(BroadcastNotificationDto dto);

        // 10. Support Info
        StudentSupportInfoDto GetSupportInfo();
    }
}
