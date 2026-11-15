using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Invoices.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class InvoiceConfiguration : IEntityTypeConfiguration<HoaDon>
    {
        public void Configure(EntityTypeBuilder<HoaDon> builder)
        {
            // Một hợp đồng có thể có nhiều hóa đơn trong cùng tháng (tiền phòng, điện, nước, dịch vụ...).
            builder.HasIndex(h => new { h.MaHopDong, h.Thang, h.Nam });
        }
    }
}
