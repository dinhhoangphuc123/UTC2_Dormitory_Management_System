using Microsoft.EntityFrameworkCore;
using Quan_ly_Ky_tuc_xa.Models.Entities;

namespace Quan_ly_Ky_tuc_xa.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<NamHoc> NamHocs => Set<NamHoc>();
        public DbSet<KyHoc> KyHocs => Set<KyHoc>();
        public DbSet<LopHoc> LopHocs => Set<LopHoc>();
        public DbSet<SinhVien> SinhViens => Set<SinhVien>();
        public DbSet<PhuHuynhLienHe> PhuHuynhLienHes => Set<PhuHuynhLienHe>();
        public DbSet<ToaNha> ToaNhas => Set<ToaNha>();
        public DbSet<LoaiPhong> LoaiPhongs => Set<LoaiPhong>();
        public DbSet<Phong> Phongs => Set<Phong>();
        public DbSet<Giuong> Giuongs => Set<Giuong>();
        public DbSet<NhanVien> NhanViens => Set<NhanVien>();
        public DbSet<VaiTro> VaiTros => Set<VaiTro>();
        public DbSet<TaiKhoan> TaiKhoans => Set<TaiKhoan>();
        public DbSet<DotDangKy> DotDangKys => Set<DotDangKy>();
        public DbSet<DonDangKy> DonDangKys => Set<DonDangKy>();
        public DbSet<HopDong> HopDongs => Set<HopDong>();
        public DbSet<TaiSanPhong> TaiSanPhongs => Set<TaiSanPhong>();
        public DbSet<YeuCauSuaChua> YeuCauSuaChuas => Set<YeuCauSuaChua>();
        public DbSet<LoaiViPham> LoaiViPhams => Set<LoaiViPham>();
        public DbSet<ViPham> ViPhams => Set<ViPham>();
        public DbSet<DichVu> DichVus => Set<DichVu>();
        public DbSet<DangKyDichVu> DangKyDichVus => Set<DangKyDichVu>();
        public DbSet<GiaDienNuoc> GiaDienNuocs => Set<GiaDienNuoc>();
        public DbSet<ChiSoDienNuoc> ChiSoDienNuocs => Set<ChiSoDienNuoc>();
        public DbSet<HoaDonPhong> HoaDonPhongs => Set<HoaDonPhong>();
        public DbSet<HoaDon> HoaDons => Set<HoaDon>();
        public DbSet<ChiTietHoaDon> ChiTietHoaDons => Set<ChiTietHoaDon>();
        public DbSet<ThanhToan> ThanhToans => Set<ThanhToan>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // KyHoc unique (maNamHoc, tenKyHoc)
            modelBuilder.Entity<KyHoc>()
                .HasIndex(k => new { k.MaNamHoc, k.TenKyHoc })
                .IsUnique();

            // Giuong unique (maPhong, soThuTu)
            modelBuilder.Entity<Giuong>()
                .HasIndex(g => new { g.MaPhong, g.SoThuTu })
                .IsUnique();

            // DonDangKy unique (maSinhVien, maDotDangKy)
            modelBuilder.Entity<DonDangKy>()
                .HasIndex(d => new { d.MaSinhVien, d.MaDotDangKy })
                .IsUnique();

            // HopDong unique on active contract per Giuong & per SinhVien
            modelBuilder.Entity<HopDong>()
                .HasIndex(h => h.MaGiuong)
                .HasFilter("[trangThai] = N'hieuLuc'");

            modelBuilder.Entity<HopDong>()
                .HasIndex(h => h.MaSinhVien)
                .HasFilter("[trangThai] = N'hieuLuc'");

            // GiaDienNuoc unique (loai, ngayApDung)
            modelBuilder.Entity<GiaDienNuoc>()
                .HasIndex(g => new { g.Loai, g.NgayApDung })
                .IsUnique();

            // ChiSoDienNuoc unique (maPhong, loai, thang, nam)
            modelBuilder.Entity<ChiSoDienNuoc>()
                .HasIndex(c => new { c.MaPhong, c.Loai, c.Thang, c.Nam })
                .IsUnique();

            // HoaDonPhong unique (maPhong, thang, nam)
            modelBuilder.Entity<HoaDonPhong>()
                .HasIndex(h => new { h.MaPhong, h.Thang, h.Nam })
                .IsUnique();

            // HoaDon unique (maHopDong, thang, nam)
            modelBuilder.Entity<HoaDon>()
                .HasIndex(h => new { h.MaHopDong, h.Thang, h.Nam })
                .IsUnique();

            // ChiTietHoaDon computed column
            modelBuilder.Entity<ChiTietHoaDon>()
                .Property(c => c.ThanhTien)
                .HasComputedColumnSql("CONVERT(DECIMAL(14,2), soLuong * donGia)", stored: true);

            // TaiKhoan 1-to-1 relationships
            modelBuilder.Entity<TaiKhoan>()
                .HasOne(t => t.NhanVien)
                .WithOne(n => n.TaiKhoan)
                .HasForeignKey<TaiKhoan>(t => t.MaNhanVien)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<TaiKhoan>()
                .HasOne(t => t.SinhVien)
                .WithOne(s => s.TaiKhoan)
                .HasForeignKey<TaiKhoan>(t => t.MaSinhVien)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}

