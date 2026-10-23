using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Invoices.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class InvoiceConfiguration : IEntityTypeConfiguration<HoaDon>
    {
        public void Configure(EntityTypeBuilder<HoaDon> builder)
        {
            builder.HasIndex(h => new { h.MaHopDong, h.Thang, h.Nam }).IsUnique();
        }
    }
}
