using Microsoft.EntityFrameworkCore;
using Dormitory.Web.Features.Accounts.Entities;
using Dormitory.Web.Features.Staff.Entities;
using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Features.Buildings.Entities;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Contracts.Entities;
using Dormitory.Web.Features.Utilities.Entities;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Payments.Entities;
using Dormitory.Web.Features.Maintenance.Entities;
using Dormitory.Web.Features.Violations.Entities;

namespace Dormitory.Web.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // 1. Accounts & Staff
        public DbSet<VaiTro> VaiTros => Set<VaiTro>();
        public DbSet<TaiKhoan> TaiKhoans => Set<TaiKhoan>();
        public DbSet<NhanVien> NhanViens => Set<NhanVien>();

        // 2. Academic & Students
        public DbSet<NamHoc> NamHocs => Set<NamHoc>();
        public DbSet<KyHoc> KyHocs => Set<KyHoc>();
        public DbSet<LopHoc> LopHocs => Set<LopHoc>();
        public DbSet<SinhVien> SinhViens => Set<SinhVien>();
        public DbSet<PhuHuynhLienHe> PhuHuynhLienHes => Set<PhuHuynhLienHe>();

        // 3. Buildings & Rooms
        public DbSet<ToaNha> ToaNhas => Set<ToaNha>();
        public DbSet<LoaiPhong> LoaiPhongs => Set<LoaiPhong>();
        public DbSet<Phong> Phongs => Set<Phong>();
        public DbSet<Giuong> Giuongs => Set<Giuong>();

        // 4. Registrations & Contracts
        public DbSet<DotDangKy> DotDangKys => Set<DotDangKy>();
        public DbSet<DonDangKy> DonDangKys => Set<DonDangKy>();
        public DbSet<HopDong> HopDongs => Set<HopDong>();

        // 5. Utilities & Services
        public DbSet<DichVu> DichVus => Set<DichVu>();
        public DbSet<DangKyDichVu> DangKyDichVus => Set<DangKyDichVu>();
        public DbSet<GiaDienNuoc> GiaDienNuocs => Set<GiaDienNuoc>();
        public DbSet<ChiSoDienNuoc> ChiSoDienNuocs => Set<ChiSoDienNuoc>();
        public DbSet<HoaDonPhong> HoaDonPhongs => Set<HoaDonPhong>();

        // 6. Invoices & Payments
        public DbSet<HoaDon> HoaDons => Set<HoaDon>();
        public DbSet<ChiTietHoaDon> ChiTietHoaDons => Set<ChiTietHoaDon>();
        public DbSet<ThanhToan> ThanhToans => Set<ThanhToan>();

        // 7. Maintenance & Violations
        public DbSet<TaiSanPhong> TaiSanPhongs => Set<TaiSanPhong>();
        public DbSet<YeuCauSuaChua> YeuCauSuaChuas => Set<YeuCauSuaChua>();
        public DbSet<LoaiViPham> LoaiViPhams => Set<LoaiViPham>();
        public DbSet<ViPham> ViPhams => Set<ViPham>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        }
    }
}

