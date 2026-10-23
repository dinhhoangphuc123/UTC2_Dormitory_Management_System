using Dormitory.Web.Features.Contracts.DTOs;

namespace Dormitory.Web.Features.Contracts.Services
{
    public interface IHopDongService
    {
        Task<List<ContractListItemDto>> GetAllContractsAsync(string? statusTab = null, string? building = null, string? search = null);
        Task<ContractListItemDto?> GetContractByIdAsync(string id);
        Task<ContractListItemDto> CreateContractAsync(CreateContractRequestDto req, string staffId);
        Task<bool> RenewContractAsync(string contractId, int months = 5);
        Task<bool> LiquidateContractAsync(string contractId, string? reason = null);
    }
}

