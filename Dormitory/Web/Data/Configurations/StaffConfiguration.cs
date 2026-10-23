using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Staff.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class StaffConfiguration : IEntityTypeConfiguration<NhanVien>
    {
        public void Configure(EntityTypeBuilder<NhanVien> builder)
        {
            builder.HasIndex(n => n.Email);
            builder.HasIndex(n => n.DienThoai);
        }
    }
}

