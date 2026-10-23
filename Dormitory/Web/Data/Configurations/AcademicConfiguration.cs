using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Academic.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class AcademicConfiguration : IEntityTypeConfiguration<KyHoc>, IEntityTypeConfiguration<LopHoc>
    {
        public void Configure(EntityTypeBuilder<KyHoc> builder)
        {
            builder.HasIndex(k => new { k.MaNamHoc, k.TenKyHoc })
                .IsUnique();
        }

        public void Configure(EntityTypeBuilder<LopHoc> builder)
        {
            builder.HasIndex(l => l.TenLop);
        }
    }
}

