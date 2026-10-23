using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Violations.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class ViolationConfiguration : IEntityTypeConfiguration<ViPham>, IEntityTypeConfiguration<LoaiViPham>
    {
        public void Configure(EntityTypeBuilder<ViPham> builder)
        {
            builder.HasIndex(v => v.MaSinhVien);
            builder.HasIndex(v => v.NgayViPham);
        }

        public void Configure(EntityTypeBuilder<LoaiViPham> builder)
        {
            builder.HasIndex(l => l.TenLoaiViPham);
        }
    }
}

