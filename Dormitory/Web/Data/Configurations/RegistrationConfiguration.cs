using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Registrations.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class RegistrationConfiguration : IEntityTypeConfiguration<DonDangKy>
    {
        public void Configure(EntityTypeBuilder<DonDangKy> builder)
        {
            builder.HasIndex(d => new { d.MaSinhVien, d.MaDotDangKy })
                .IsUnique();

            // Một giường chỉ được giữ bởi tối đa một đơn đang chờ duyệt.
            builder.HasIndex(d => d.MaGiuong)
                .IsUnique()
                .HasFilter("[maGiuong] IS NOT NULL AND [trangThai] = 'choDuyet'");
        }
    }
}

