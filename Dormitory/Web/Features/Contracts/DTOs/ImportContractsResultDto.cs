namespace Dormitory.Web.Features.Contracts.DTOs
{
    public class ImportContractsResultDto
    {
        public int Imported { get; set; }
        public int Skipped { get; set; }
        public int Failed { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<ImportContractRowErrorDto> Errors { get; set; } = new();
        public List<ContractListItemDto> CreatedContracts { get; set; } = new();
    }

    public class ImportContractRowErrorDto
    {
        public ImportContractRowErrorDto()
        {
        }

        public ImportContractRowErrorDto(int row, string mssv, string message)
        {
            Row = row;
            Mssv = mssv;
            Message = message;
        }

        public int Row { get; set; }
        public string Mssv { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
