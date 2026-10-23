using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Invoices.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class InvoiceConfiguration : IEntityTypeConfiguration<HoaDon>, IEntityTypeConfiguration<ChiTietHoaDon>
    {
        public void Configure(EntityTypeBuilder<HoaDon> builder)
        {
            builder.HasIndex(h => new { h.MaHopDong, h.Thang, h.Nam }).IsUnique();
        }

        public void Configure(EntityTypeBuilder<ChiTietHoaDon> builder)
        {
            builder.Property(c => c.ThanhTien)
                .HasComputedColumnSql("CONVERT(DECIMAL(14,2), soLuong * donGia)", stored: true);
        }
    }
}

