using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Payments.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class PaymentConfiguration : IEntityTypeConfiguration<ThanhToan>
    {
        public void Configure(EntityTypeBuilder<ThanhToan> builder)
        {
            builder.HasIndex(t => t.MaHoaDon);
        }
    }
}

