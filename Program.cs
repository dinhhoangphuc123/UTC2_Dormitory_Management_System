using Microsoft.EntityFrameworkCore;
using Quan_ly_Ky_tuc_xa.Data;
using Quan_ly_Ky_tuc_xa.Services.Implementations;
using Quan_ly_Ky_tuc_xa.Services.Interfaces;

namespace Quan_ly_Ky_tuc_xa
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // 1. Configure Database Connection
            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                ?? "Server=.\\SQLEXPRESS;Database=DO_AN_QUAN_LY_KTX;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true;";

            builder.Services.AddDbContext<ApplicationDbContext>(options =>
            {
                try
                {
                    options.UseSqlServer(connectionString, sqlOptions =>
                    {
                        sqlOptions.CommandTimeout(30);
                    });
                }
                catch
                {
                    options.UseInMemoryDatabase("FallbackKtxDb");
                }
            });

            // 2. Register Business Services (Clean Architecture)
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<IDashboardService, DashboardService>();
            builder.Services.AddScoped<ISinhVienService, SinhVienService>();
            builder.Services.AddScoped<IHopDongService, HopDongService>();
            builder.Services.AddScoped<IDonDangKyService, DonDangKyService>();
            builder.Services.AddScoped<IPhongService, PhongService>();
            builder.Services.AddScoped<ILopHocService, LopHocService>();
            builder.Services.AddScoped<IDienNuocDichVuService, DienNuocDichVuService>();
            builder.Services.AddScoped<IHoaDonService, HoaDonService>();
            builder.Services.AddScoped<IYeuCauSuaChuaService, YeuCauSuaChuaService>();
            builder.Services.AddScoped<IViPhamService, ViPhamService>();
            builder.Services.AddScoped<INhanVienService, NhanVienService>();
            builder.Services.AddScoped<IBaoCaoService, BaoCaoService>();

            // 3. MVC & Web APIs
            builder.Services.AddControllersWithViews()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
                });

            var app = builder.Build();

            // 4. Auto Seed Database on First Run
            using (var scope = app.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                try
                {
                    var context = services.GetRequiredService<ApplicationDbContext>();
                    await DbInitializer.SeedAsync(context);
                }
                catch (Exception ex)
                {
                    var logger = services.GetRequiredService<ILogger<Program>>();
                    logger.LogWarning(ex, "Không thể kết nối SQL Server, hệ thống sẽ sử dụng bộ nhớ tạm để phục vụ giao diện.");
                }
            }

            // 5. HTTP Pipeline
            if (!app.Environment.IsDevelopment())
            {
                app.UseExceptionHandler("/Home/Error");
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseStaticFiles();

            app.UseRouting();

            app.UseAuthorization();

            app.MapControllers();
            app.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}");

            await app.RunAsync();
        }
    }
}
