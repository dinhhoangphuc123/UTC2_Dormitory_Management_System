using Dormitory.Web.Features.Contracts.DTOs;

namespace Dormitory.Web.Features.Contracts.Services
{
    public interface IHopDongService
    {
        Task<List<ContractListItemDto>> GetAllContractsAsync(string? statusTab = null, string? building = null, string? search = null, string? academicYear = null);
        Task<ContractListItemDto?> GetContractByIdAsync(string id, string? academicYear = null);
        Task<ContractListItemDto?> CreateContractAsync(CreateContractRequestDto req, string? staffId, string? academicYear = null);
        Task<bool> RenewContractAsync(string contractId, int months = 5, string? academicYear = null);
        Task<bool> LiquidateContractAsync(string contractId, string? reason = null, string? academicYear = null);
    }
}
