using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Features.Accounts.Entities;

namespace Dormitory.Web.Data.Seeding
{
    public static class RoleSeeder
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            if (!await context.VaiTros.AnyAsync())
            {
                var vaiTros = new List<VaiTro>
                {
                    new() { MaVaiTro = "admin", TenVaiTro = "Quản trị viên" },
                    new() { MaVaiTro = "quanLy", TenVaiTro = "Quản lý KTX" },
                    new() { MaVaiTro = "keToan", TenVaiTro = "Kế toán" },
                    new() { MaVaiTro = "sinhVien", TenVaiTro = "Sinh viên" }
                };
                await context.VaiTros.AddRangeAsync(vaiTros);
                await context.SaveChangesAsync();
            }
        }
    }
}

