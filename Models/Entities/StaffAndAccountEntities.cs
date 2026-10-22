using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Quan_ly_Ky_tuc_xa.Models.Entities
{
    [Table("nhanVien")]
    public class NhanVien
    {
        [Key]
        [MaxLength(20)]
        [Column("maNhanVien")]
        public string MaNhanVien { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("hoTen")]
        public string HoTen { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("chucVu")]
        public string ChucVu { get; set; } = string.Empty;

        [MaxLength(15)]
        [Column("dienThoai")]
        public string? DienThoai { get; set; }

        [MaxLength(100)]
        [Column("email")]
        public string? Email { get; set; }

        [MaxLength(10)]
        [Column("maToaNhaPhuTrach")]
        public string? MaToaNhaPhuTrach { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "dangLam"; // dangLam, nghiViec

        [ForeignKey(nameof(MaToaNhaPhuTrach))]
        public virtual ToaNha? ToaNhaPhuTrach { get; set; }

        public virtual TaiKhoan? TaiKhoan { get; set; }

        public virtual ICollection<DonDangKy> DanhSachDonDangKyDuyet { get; set; } = new List<DonDangKy>();
        public virtual ICollection<HopDong> DanhSachHopDongLap { get; set; } = new List<HopDong>();
        public virtual ICollection<YeuCauSuaChua> DanhSachYeuCauSuaChuaXuLy { get; set; } = new List<YeuCauSuaChua>();
        public virtual ICollection<ViPham> DanhSachViPhamLap { get; set; } = new List<ViPham>();
        public virtual ICollection<ChiSoDienNuoc> DanhSachChiSoGhi { get; set; } = new List<ChiSoDienNuoc>();
        public virtual ICollection<ThanhToan> DanhSachThanhToanThu { get; set; } = new List<ThanhToan>();
    }

    [Table("vaiTro")]
    public class VaiTro
    {
        [Key]
        [MaxLength(20)]
        [Column("maVaiTro")]
        public string MaVaiTro { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("tenVaiTro")]
        public string TenVaiTro { get; set; } = string.Empty; // admin, quanLy, keToan, sinhVien

        public virtual ICollection<TaiKhoan> DanhSachTaiKhoan { get; set; } = new List<TaiKhoan>();
    }

    [Table("taiKhoan")]
    public class TaiKhoan
    {
        [Key]
        [MaxLength(50)]
        [Column("tenDangNhap")]
        public string TenDangNhap { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("matKhauHash")]
        public string MatKhauHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maVaiTro")]
        public string MaVaiTro { get; set; } = string.Empty;

        [MaxLength(20)]
        [Column("maNhanVien")]
        public string? MaNhanVien { get; set; }

        [MaxLength(20)]
        [Column("maSinhVien")]
        public string? MaSinhVien { get; set; }

        [Column("laDangHoat")]
        public bool LaDangHoat { get; set; } = true;

        [Column("lanDangNhapCuoi")]
        public DateTime? LanDangNhapCuoi { get; set; }

        [ForeignKey(nameof(MaVaiTro))]
        public virtual VaiTro? VaiTro { get; set; }

        [ForeignKey(nameof(MaNhanVien))]
        public virtual NhanVien? NhanVien { get; set; }

        [ForeignKey(nameof(MaSinhVien))]
        public virtual SinhVien? SinhVien { get; set; }
    }
}

