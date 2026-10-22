using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Quan_ly_Ky_tuc_xa.Models.Entities
{
    [Table("taiSanPhong")]
    public class TaiSanPhong
    {
        [Key]
        [MaxLength(20)]
        [Column("maTaiSan")]
        public string MaTaiSan { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maPhong")]
        public string MaPhong { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("tenTaiSan")]
        public string TenTaiSan { get; set; } = string.Empty;

        [Column("soLuong")]
        public int SoLuong { get; set; } = 1;

        [Required]
        [MaxLength(20)]
        [Column("tinhTrang")]
        public string TinhTrang { get; set; } = "tot"; // tot, hong, matMat, thanhLy

        [Column("ngayCap", TypeName = "date")]
        public DateTime? NgayCap { get; set; }

        [ForeignKey(nameof(MaPhong))]
        public virtual Phong? Phong { get; set; }

        public virtual ICollection<YeuCauSuaChua> DanhSachYeuCauSuaChua { get; set; } = new List<YeuCauSuaChua>();
    }

    [Table("yeuCauSuaChua")]
    public class YeuCauSuaChua
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("maYeuCau")]
        public int MaYeuCau { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maPhong")]
        public string MaPhong { get; set; } = string.Empty;

        [MaxLength(20)]
        [Column("maTaiSan")]
        public string? MaTaiSan { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maSinhVienGui")]
        public string MaSinhVienGui { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        [Column("moTa")]
        public string MoTa { get; set; } = string.Empty;

        [Column("ngayGui")]
        public DateTime NgayGui { get; set; } = DateTime.Now;

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "moiGui"; // moiGui, dangXuLy, hoanThanh, tuChoi

        [MaxLength(20)]
        [Column("maNhanVienXuLy")]
        public string? MaNhanVienXuLy { get; set; }

        [Column("ngayHoanThanh")]
        public DateTime? NgayHoanThanh { get; set; }

        [ForeignKey(nameof(MaPhong))]
        public virtual Phong? Phong { get; set; }

        [ForeignKey(nameof(MaTaiSan))]
        public virtual TaiSanPhong? TaiSanPhong { get; set; }

        [ForeignKey(nameof(MaSinhVienGui))]
        public virtual SinhVien? SinhVienGui { get; set; }

        [ForeignKey(nameof(MaNhanVienXuLy))]
        public virtual NhanVien? NhanVienXuLy { get; set; }
    }

    [Table("loaiViPham")]
    public class LoaiViPham
    {
        [Key]
        [MaxLength(20)]
        [Column("maLoaiViPham")]
        public string MaLoaiViPham { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("tenLoaiViPham")]
        public string TenLoaiViPham { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("mucDo")]
        public string MucDo { get; set; } = "nhe"; // nhe, trungBinh, nang

        [Column("tienPhat", TypeName = "decimal(12,2)")]
        public decimal TienPhat { get; set; } = 0;

        public virtual ICollection<ViPham> DanhSachViPham { get; set; } = new List<ViPham>();
    }

    [Table("viPham")]
    public class ViPham
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("maViPham")]
        public int MaViPham { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maSinhVien")]
        public string MaSinhVien { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maLoaiViPham")]
        public string MaLoaiViPham { get; set; } = string.Empty;

        [Required]
        [Column("ngayViPham", TypeName = "date")]
        public DateTime NgayViPham { get; set; }

        [Column("noiDung")]
        public string? NoiDung { get; set; }

        [Required]
        [MaxLength(30)]
        [Column("hinhThucXuLy")]
        public string HinhThucXuLy { get; set; } = "nhacNho"; // nhacNho, phatTien, canhCao, buocRaKhoi

        [Required]
        [MaxLength(20)]
        [Column("maNhanVienLap")]
        public string MaNhanVienLap { get; set; } = string.Empty;

        [ForeignKey(nameof(MaSinhVien))]
        public virtual SinhVien? SinhVien { get; set; }

        [ForeignKey(nameof(MaLoaiViPham))]
        public virtual LoaiViPham? LoaiViPham { get; set; }

        [ForeignKey(nameof(MaNhanVienLap))]
        public virtual NhanVien? NhanVienLap { get; set; }

        public virtual ICollection<ChiTietHoaDon> DanhSachChiTietHoaDon { get; set; } = new List<ChiTietHoaDon>();
    }
}

