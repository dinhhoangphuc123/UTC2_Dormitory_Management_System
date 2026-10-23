using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Contracts.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class ContractConfiguration : IEntityTypeConfiguration<HopDong>
    {
        public void Configure(EntityTypeBuilder<HopDong> builder)
        {
            builder.HasIndex(h => h.MaGiuong)
                .HasFilter("[trangThai] = N'hieuLuc'");

            builder.HasIndex(h => h.MaSinhVien)
                .HasFilter("[trangThai] = N'hieuLuc'");
        }
    }
}

