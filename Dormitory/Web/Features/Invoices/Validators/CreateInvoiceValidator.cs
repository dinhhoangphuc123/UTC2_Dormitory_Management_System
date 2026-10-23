using Dormitory.Web.Features.Invoices.DTOs;

namespace Dormitory.Web.Features.Invoices.Validators
{
    public static class CreateInvoiceValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(CreateInvoiceDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Room))
                return (false, "Phòng không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.StudentId))
                return (false, "Mã sinh viên không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.StudentName))
                return (false, "Tên sinh viên không được để trống.");
            if (string.IsNullOrWhiteSpace(dto.Title))
                return (false, "Tiêu đề hóa đơn không được để trống.");
            if (dto.Amount <= 0)
                return (false, "Số tiền phải lớn hơn 0.");
            return (true, null);
        }
    }
}

