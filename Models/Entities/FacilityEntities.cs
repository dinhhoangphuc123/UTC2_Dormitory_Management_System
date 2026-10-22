using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Quan_ly_Ky_tuc_xa.Models.Entities
{
    [Table("toaNha")]
    public class ToaNha
    {
        [Key]
        [MaxLength(10)]
        [Column("maToaNha")]
        public string MaToaNha { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("tenToaNha")]
        public string TenToaNha { get; set; } = string.Empty;

        [Column("soTang")]
        public int SoTang { get; set; }

        [Required]
        [MaxLength(10)]
        [Column("gioiTinhQuyDinh")]
        public string GioiTinhQuyDinh { get; set; } = "nam"; // nam, nu, honHop

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "hoatDong"; // hoatDong, baoTri, ngung

        public virtual ICollection<Phong> DanhSachPhong { get; set; } = new List<Phong>();
        public virtual ICollection<NhanVien> DanhSachNhanVienPhuTrach { get; set; } = new List<NhanVien>();
    }

    [Table("loaiPhong")]
    public class LoaiPhong
    {
        [Key]
        [MaxLength(20)]
        [Column("maLoaiPhong")]
        public string MaLoaiPhong { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("tenLoaiPhong")]
        public string TenLoaiPhong { get; set; } = string.Empty;

        [Column("soNguoiToiDa")]
        public int SoNguoiToiDa { get; set; } = 8;

        [Column("giaThueThang", TypeName = "decimal(12,2)")]
        public decimal GiaThueThang { get; set; }

        [Column("coDieuHoa")]
        public bool CoDieuHoa { get; set; } = false;

        [Column("coNhaVeSinhRieng")]
        public bool CoNhaVeSinhRieng { get; set; } = true;

        public virtual ICollection<Phong> DanhSachPhong { get; set; } = new List<Phong>();
        public virtual ICollection<DonDangKy> DanhSachDonDangKy { get; set; } = new List<DonDangKy>();
    }

    [Table("phong")]
    public class Phong
    {
        [Key]
        [MaxLength(20)]
        [Column("maPhong")]
        public string MaPhong { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        [Column("maToaNha")]
        public string MaToaNha { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maLoaiPhong")]
        public string MaLoaiPhong { get; set; } = string.Empty;

        [Column("soTang")]
        public int SoTang { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "hoatDong"; // hoatDong, baoTri, ngung

        [ForeignKey(nameof(MaToaNha))]
        public virtual ToaNha? ToaNha { get; set; }

        [ForeignKey(nameof(MaLoaiPhong))]
        public virtual LoaiPhong? LoaiPhong { get; set; }

        public virtual ICollection<Giuong> DanhSachGiuong { get; set; } = new List<Giuong>();
        public virtual ICollection<TaiSanPhong> DanhSachTaiSan { get; set; } = new List<TaiSanPhong>();
        public virtual ICollection<YeuCauSuaChua> DanhSachYeuCauSuaChua { get; set; } = new List<YeuCauSuaChua>();
        public virtual ICollection<ChiSoDienNuoc> DanhSachChiSoDienNuoc { get; set; } = new List<ChiSoDienNuoc>();
        public virtual ICollection<HoaDonPhong> DanhSachHoaDonPhong { get; set; } = new List<HoaDonPhong>();
    }

    [Table("giuong")]
    public class Giuong
    {
        [Key]
        [MaxLength(20)]
        [Column("maGiuong")]
        public string MaGiuong { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maPhong")]
        public string MaPhong { get; set; } = string.Empty;

        [Column("soThuTu")]
        public int SoThuTu { get; set; }

        [Column("laDangHoat")]
        public bool LaDangHoat { get; set; } = true;

        [ForeignKey(nameof(MaPhong))]
        public virtual Phong? Phong { get; set; }

        public virtual ICollection<HopDong> DanhSachHopDong { get; set; } = new List<HopDong>();
    }
}

