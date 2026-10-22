using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Quan_ly_Ky_tuc_xa.Models.Entities
{
    [Table("dotDangKy")]
    public class DotDangKy
    {
        [Key]
        [MaxLength(20)]
        [Column("maDotDangKy")]
        public string MaDotDangKy { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("tenDot")]
        public string TenDot { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maKyHoc")]
        public string MaKyHoc { get; set; } = string.Empty;

        [Required]
        [Column("ngayMo", TypeName = "date")]
        public DateTime NgayMo { get; set; }

        [Required]
        [Column("ngayDong", TypeName = "date")]
        public DateTime NgayDong { get; set; }

        [ForeignKey(nameof(MaKyHoc))]
        public virtual KyHoc? KyHoc { get; set; }

        public virtual ICollection<DonDangKy> DanhSachDonDangKy { get; set; } = new List<DonDangKy>();
    }

    [Table("donDangKy")]
    public class DonDangKy
    {
        [Key]
        [MaxLength(20)]
        [Column("maDonDangKy")]
        public string MaDonDangKy { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maSinhVien")]
        public string MaSinhVien { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maDotDangKy")]
        public string MaDotDangKy { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maLoaiPhong")]
        public string MaLoaiPhong { get; set; } = string.Empty;

        [Column("ngayDangKy")]
        public DateTime NgayDangKy { get; set; } = DateTime.Now;

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "choDuyet"; // choDuyet, daDuyet, tuChoi, daHuy

        [MaxLength(20)]
        [Column("maNhanVienDuyet")]
        public string? MaNhanVienDuyet { get; set; }

        [Column("ngayDuyet")]
        public DateTime? NgayDuyet { get; set; }

        [MaxLength(255)]
        [Column("ghiChu")]
        public string? GhiChu { get; set; }

        [ForeignKey(nameof(MaSinhVien))]
        public virtual SinhVien? SinhVien { get; set; }

        [ForeignKey(nameof(MaDotDangKy))]
        public virtual DotDangKy? DotDangKy { get; set; }

        [ForeignKey(nameof(MaLoaiPhong))]
        public virtual LoaiPhong? LoaiPhong { get; set; }

        [ForeignKey(nameof(MaNhanVienDuyet))]
        public virtual NhanVien? NhanVienDuyet { get; set; }

        public virtual ICollection<HopDong> DanhSachHopDong { get; set; } = new List<HopDong>();
    }

    [Table("hopDong")]
    public class HopDong
    {
        [Key]
        [MaxLength(20)]
        [Column("maHopDong")]
        public string MaHopDong { get; set; } = string.Empty;

        [MaxLength(20)]
        [Column("maDonDangKy")]
        public string? MaDonDangKy { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maSinhVien")]
        public string MaSinhVien { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maGiuong")]
        public string MaGiuong { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maKyHoc")]
        public string MaKyHoc { get; set; } = string.Empty;

        [Required]
        [Column("ngayBatDau", TypeName = "date")]
        public DateTime NgayBatDau { get; set; }

        [Required]
        [Column("ngayKetThuc", TypeName = "date")]
        public DateTime NgayKetThuc { get; set; }

        [Column("ngayNhanPhongThucTe", TypeName = "date")]
        public DateTime? NgayNhanPhongThucTe { get; set; }

        [Column("ngayTraPhongThucTe", TypeName = "date")]
        public DateTime? NgayTraPhongThucTe { get; set; }

        [Column("giaThueThang", TypeName = "decimal(12,2)")]
        public decimal GiaThueThang { get; set; }

        [Column("tienCoc", TypeName = "decimal(12,2)")]
        public decimal TienCoc { get; set; } = 0;

        [Column("phanTramMienGiam", TypeName = "decimal(5,2)")]
        public decimal PhanTramMienGiam { get; set; } = 0;

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "hieuLuc"; // hieuLuc, daKetThuc, daHuy

        [Column("ngayThanhLy", TypeName = "date")]
        public DateTime? NgayThanhLy { get; set; }

        [MaxLength(255)]
        [Column("lyDoThanhLy")]
        public string? LyDoThanhLy { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maNhanVienLap")]
        public string MaNhanVienLap { get; set; } = string.Empty;

        [ForeignKey(nameof(MaDonDangKy))]
        public virtual DonDangKy? DonDangKy { get; set; }

        [ForeignKey(nameof(MaSinhVien))]
        public virtual SinhVien? SinhVien { get; set; }

        [ForeignKey(nameof(MaGiuong))]
        public virtual Giuong? Giuong { get; set; }

        [ForeignKey(nameof(MaKyHoc))]
        public virtual KyHoc? KyHoc { get; set; }

        [ForeignKey(nameof(MaNhanVienLap))]
        public virtual NhanVien? NhanVienLap { get; set; }

        public virtual ICollection<DangKyDichVu> DanhSachDangKyDichVu { get; set; } = new List<DangKyDichVu>();
        public virtual ICollection<HoaDon> DanhSachHoaDon { get; set; } = new List<HoaDon>();
    }
}

