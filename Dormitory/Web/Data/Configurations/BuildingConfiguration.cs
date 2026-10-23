using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dormitory.Web.Features.Buildings.Entities;

namespace Dormitory.Web.Data.Configurations
{
    public class BuildingConfiguration : IEntityTypeConfiguration<ToaNha>
    {
        public void Configure(EntityTypeBuilder<ToaNha> builder)
        {
            builder.HasIndex(t => t.TenToaNha);
        }
    }
}

