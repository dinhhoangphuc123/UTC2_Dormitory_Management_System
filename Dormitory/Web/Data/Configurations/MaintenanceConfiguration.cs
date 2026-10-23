using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Maintenance.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class MaintenanceConfiguration : IEntityTypeConfiguration<YeuCauSuaChua>, IEntityTypeConfiguration<TaiSanPhong>
    {
        public void Configure(EntityTypeBuilder<YeuCauSuaChua> builder)
        {
            builder.HasIndex(y => y.MaPhong);
            builder.HasIndex(y => y.TrangThai);
        }

        public void Configure(EntityTypeBuilder<TaiSanPhong> builder)
        {
            builder.HasIndex(t => t.MaPhong);
        }
    }
}

