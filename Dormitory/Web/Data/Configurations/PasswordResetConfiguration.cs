using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Accounts.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class PasswordResetConfiguration : IEntityTypeConfiguration<MaDatLaiMatKhau>
    {
        public void Configure(EntityTypeBuilder<MaDatLaiMatKhau> builder)
        {
            // Tra cứu mã mới nhất theo định danh (tên đăng nhập hoặc email).
            builder.HasIndex(x => new { x.DinhDanh, x.NgayTao });
        }
    }
}
