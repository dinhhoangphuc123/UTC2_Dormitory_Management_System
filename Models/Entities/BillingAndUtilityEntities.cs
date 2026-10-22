using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Quan_ly_Ky_tuc_xa.Models.Entities
{
    [Table("dichVu")]
    public class DichVu
    {
        [Key]
        [MaxLength(20)]
        [Column("maDichVu")]
        public string MaDichVu { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("tenDichVu")]
        public string TenDichVu { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("donViTinh")]
        public string DonViTinh { get; set; } = string.Empty;

        [Column("donGia", TypeName = "decimal(12,2)")]
        public decimal DonGia { get; set; }

        [Column("laDangHoat")]
        public bool LaDangHoat { get; set; } = true;

        public virtual ICollection<DangKyDichVu> DanhSachDangKyDichVu { get; set; } = new List<DangKyDichVu>();
        public virtual ICollection<ChiTietHoaDon> DanhSachChiTietHoaDon { get; set; } = new List<ChiTietHoaDon>();
    }

    [Table("dangKyDichVu")]
    public class DangKyDichVu
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("maDangKyDV")]
        public int MaDangKyDV { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maHopDong")]
        public string MaHopDong { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maDichVu")]
        public string MaDichVu { get; set; } = string.Empty;

        [Column("soLuong")]
        public int SoLuong { get; set; } = 1;

        [Required]
        [Column("ngayBatDau", TypeName = "date")]
        public DateTime NgayBatDau { get; set; }

        [Column("ngayKetThuc", TypeName = "date")]
        public DateTime? NgayKetThuc { get; set; }

        [ForeignKey(nameof(MaHopDong))]
        public virtual HopDong? HopDong { get; set; }

        [ForeignKey(nameof(MaDichVu))]
        public virtual DichVu? DichVu { get; set; }
    }

    [Table("giaDienNuoc")]
    public class GiaDienNuoc
    {
        [Key]
        [MaxLength(20)]
        [Column("maGia")]
        public string MaGia { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        [Column("loai")]
        public string Loai { get; set; } = "dien"; // dien, nuoc

        [Column("gia", TypeName = "decimal(10,2)")]
        public decimal Gia { get; set; }

        [Required]
        [Column("ngayApDung", TypeName = "date")]
        public DateTime NgayApDung { get; set; }

        [Column("ngayHetHieuLuc", TypeName = "date")]
        public DateTime? NgayHetHieuLuc { get; set; }

        public virtual ICollection<ChiSoDienNuoc> DanhSachChiSo { get; set; } = new List<ChiSoDienNuoc>();
    }

    [Table("chiSoDienNuoc")]
    public class ChiSoDienNuoc
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("maChiSo")]
        public int MaChiSo { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maPhong")]
        public string MaPhong { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        [Column("loai")]
        public string Loai { get; set; } = "dien"; // dien, nuoc

        [Column("thang")]
        public int Thang { get; set; }

        [Column("nam")]
        public int Nam { get; set; }

        [Column("chiSoCu", TypeName = "decimal(10,2)")]
        public decimal ChiSoCu { get; set; }

        [Column("chiSoMoi", TypeName = "decimal(10,2)")]
        public decimal ChiSoMoi { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maGia")]
        public string MaGia { get; set; } = string.Empty;

        [Required]
        [Column("ngayGhi", TypeName = "date")]
        public DateTime NgayGhi { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maNhanVienGhi")]
        public string MaNhanVienGhi { get; set; } = string.Empty;

        [ForeignKey(nameof(MaPhong))]
        public virtual Phong? Phong { get; set; }

        [ForeignKey(nameof(MaGia))]
        public virtual GiaDienNuoc? GiaDienNuoc { get; set; }

        [ForeignKey(nameof(MaNhanVienGhi))]
        public virtual NhanVien? NhanVienGhi { get; set; }
    }

    [Table("hoaDonPhong")]
    public class HoaDonPhong
    {
        [Key]
        [MaxLength(20)]
        [Column("maHoaDonPhong")]
        public string MaHoaDonPhong { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maPhong")]
        public string MaPhong { get; set; } = string.Empty;

        [Column("thang")]
        public int Thang { get; set; }

        [Column("nam")]
        public int Nam { get; set; }

        [Column("tongTienDien", TypeName = "decimal(12,2)")]
        public decimal TongTienDien { get; set; } = 0;

        [Column("tongTienNuoc", TypeName = "decimal(12,2)")]
        public decimal TongTienNuoc { get; set; } = 0;

        [Column("soSinhVienGánh")]
        public int SoSinhVienGanh { get; set; } = 1;

        [Column("trangThaiXuLy")]
        public bool TrangThaiXuLy { get; set; } = false;

        [ForeignKey(nameof(MaPhong))]
        public virtual Phong? Phong { get; set; }

        public virtual ICollection<ChiTietHoaDon> DanhSachChiTietHoaDon { get; set; } = new List<ChiTietHoaDon>();
    }

    [Table("hoaDon")]
    public class HoaDon
    {
        [Key]
        [MaxLength(20)]
        [Column("maHoaDon")]
        public string MaHoaDon { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maHopDong")]
        public string MaHopDong { get; set; } = string.Empty;

        [Column("thang")]
        public int Thang { get; set; }

        [Column("nam")]
        public int Nam { get; set; }

        [Required]
        [Column("ngayLap", TypeName = "date")]
        public DateTime NgayLap { get; set; } = DateTime.Now;

        [Required]
        [Column("hanThanhToan", TypeName = "date")]
        public DateTime HanThanhToan { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "chuaThanhToan"; // chuaThanhToan, daThanhToan, daHuy

        [ForeignKey(nameof(MaHopDong))]
        public virtual HopDong? HopDong { get; set; }

        public virtual ICollection<ChiTietHoaDon> DanhSachChiTiet { get; set; } = new List<ChiTietHoaDon>();
        public virtual ICollection<ThanhToan> DanhSachThanhToan { get; set; } = new List<ThanhToan>();
    }

    [Table("chiTietHoaDon")]
    public class ChiTietHoaDon
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("maChiTiet")]
        public int MaChiTiet { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maHoaDon")]
        public string MaHoaDon { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("loaiKhoan")]
        public string LoaiKhoan { get; set; } = "tienPhong"; // tienPhong, dien, nuoc, dichVu, phat, khac

        [MaxLength(20)]
        [Column("maDichVu")]
        public string? MaDichVu { get; set; }

        [MaxLength(20)]
        [Column("maHoaDonPhong")]
        public string? MaHoaDonPhong { get; set; }

        [Column("maViPham")]
        public int? MaViPham { get; set; }

        [MaxLength(255)]
        [Column("dienGiai")]
        public string? DienGiai { get; set; }

        [Column("soLuong", TypeName = "decimal(10,2)")]
        public decimal SoLuong { get; set; } = 1;

        [Column("donGia", TypeName = "decimal(12,2)")]
        public decimal DonGia { get; set; }

        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        [Column("thanhTien", TypeName = "decimal(14,2)")]
        public decimal? ThanhTien { get; set; }

        [ForeignKey(nameof(MaHoaDon))]
        public virtual HoaDon? HoaDon { get; set; }

        [ForeignKey(nameof(MaDichVu))]
        public virtual DichVu? DichVu { get; set; }

        [ForeignKey(nameof(MaHoaDonPhong))]
        public virtual HoaDonPhong? HoaDonPhong { get; set; }

        [ForeignKey(nameof(MaViPham))]
        public virtual ViPham? ViPham { get; set; }
    }

    [Table("thanhToan")]
    public class ThanhToan
    {
        [Key]
        [MaxLength(20)]
        [Column("maThanhToan")]
        public string MaThanhToan { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maHoaDon")]
        public string MaHoaDon { get; set; } = string.Empty;

        [Column("soTien", TypeName = "decimal(12,2)")]
        public decimal SoTien { get; set; }

        [Column("ngayThanhToan")]
        public DateTime NgayThanhToan { get; set; } = DateTime.Now;

        [Required]
        [MaxLength(20)]
        [Column("phuongThuc")]
        public string PhuongThuc { get; set; } = "chuyenKhoan"; // tienMat, chuyenKhoan, viDienTu

        [MaxLength(20)]
        [Column("maNhanVienThu")]
        public string? MaNhanVienThu { get; set; }

        [MaxLength(255)]
        [Column("ghiChu")]
        public string? GhiChu { get; set; }

        [ForeignKey(nameof(MaHoaDon))]
        public virtual HoaDon? HoaDon { get; set; }

        [ForeignKey(nameof(MaNhanVienThu))]
        public virtual NhanVien? NhanVienThu { get; set; }
    }
}

