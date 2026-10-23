using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Rooms.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class RoomConfiguration : IEntityTypeConfiguration<Giuong>, IEntityTypeConfiguration<LoaiPhong>
    {
        public void Configure(EntityTypeBuilder<Giuong> builder)
        {
            builder.HasIndex(g => new { g.MaPhong, g.SoThuTu })
                .IsUnique();
        }

        public void Configure(EntityTypeBuilder<LoaiPhong> builder)
        {
            builder.HasIndex(l => l.TenLoaiPhong).IsUnique();
        }
    }
}

