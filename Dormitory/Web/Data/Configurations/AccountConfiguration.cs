using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Accounts.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class AccountConfiguration : IEntityTypeConfiguration<TaiKhoan>, IEntityTypeConfiguration<VaiTro>
    {
        public void Configure(EntityTypeBuilder<TaiKhoan> builder)
        {
            builder.HasOne(t => t.NhanVien)
                .WithOne(n => n.TaiKhoan)
                .HasForeignKey<TaiKhoan>(t => t.MaNhanVien)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(t => t.SinhVien)
                .WithOne(s => s.TaiKhoan)
                .HasForeignKey<TaiKhoan>(t => t.MaSinhVien)
                .OnDelete(DeleteBehavior.SetNull);
        }

        public void Configure(EntityTypeBuilder<VaiTro> builder)
        {
            builder.HasIndex(v => v.TenVaiTro).IsUnique();
        }
    }
}

