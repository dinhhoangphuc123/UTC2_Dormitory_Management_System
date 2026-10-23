using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Students.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class StudentConfiguration : IEntityTypeConfiguration<SinhVien>
    {
        public void Configure(EntityTypeBuilder<SinhVien> builder)
        {
            builder.HasIndex(s => s.Cccd).IsUnique();
        }
    }
}

