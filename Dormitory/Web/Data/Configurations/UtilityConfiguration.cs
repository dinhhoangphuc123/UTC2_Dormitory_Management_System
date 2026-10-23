using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Utilities.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class UtilityConfiguration : IEntityTypeConfiguration<GiaDienNuoc>, IEntityTypeConfiguration<ChiSoDienNuoc>, IEntityTypeConfiguration<HoaDonPhong>
    {
        public void Configure(EntityTypeBuilder<GiaDienNuoc> builder)
        {
            builder.HasIndex(g => new { g.Loai, g.NgayApDung }).IsUnique();
        }

        public void Configure(EntityTypeBuilder<ChiSoDienNuoc> builder)
        {
            builder.HasIndex(c => new { c.MaPhong, c.Loai, c.Thang, c.Nam }).IsUnique();
        }

        public void Configure(EntityTypeBuilder<HoaDonPhong> builder)
        {
            builder.HasIndex(h => new { h.MaPhong, h.Thang, h.Nam }).IsUnique();
        }
    }
}

