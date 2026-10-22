using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Quan_ly_Ky_tuc_xa.Models.Entities
{
    [Table("sinhVien")]
    public class SinhVien
    {
        [Key]
        [MaxLength(20)]
        [Column("maSinhVien")]
        public string MaSinhVien { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("hoTen")]
        public string HoTen { get; set; } = string.Empty;

        [Required]
        [Column("ngaySinh", TypeName = "date")]
        public DateTime NgaySinh { get; set; }

        [Required]
        [MaxLength(10)]
        [Column("gioiTinh")]
        public string GioiTinh { get; set; } = "nam"; // nam, nu, khac

        [Required]
        [MaxLength(20)]
        [Column("cccd")]
        public string Cccd { get; set; } = string.Empty;

        [MaxLength(15)]
        [Column("dienThoai")]
        public string? DienThoai { get; set; }

        [MaxLength(100)]
        [Column("email")]
        public string? Email { get; set; }

        [MaxLength(255)]
        [Column("diaChiThuongTru")]
        public string? DiaChiThuongTru { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maLop")]
        public string MaLop { get; set; } = string.Empty;

        [Column("namNhapHoc")]
        public int NamNhapHoc { get; set; }

        [MaxLength(50)]
        [Column("doiTuongUuTien")]
        public string? DoiTuongUuTien { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "dangHoc"; // dangHoc, baoLuu, totNghiep, thoiHoc

        [ForeignKey(nameof(MaLop))]
        public virtual LopHoc? LopHoc { get; set; }

        public virtual ICollection<PhuHuynhLienHe> DanhSachPhuHuynh { get; set; } = new List<PhuHuynhLienHe>();
        public virtual ICollection<DonDangKy> DanhSachDonDangKy { get; set; } = new List<DonDangKy>();
        public virtual ICollection<HopDong> DanhSachHopDong { get; set; } = new List<HopDong>();
        public virtual ICollection<ViPham> DanhSachViPham { get; set; } = new List<ViPham>();
        public virtual ICollection<YeuCauSuaChua> DanhSachYeuCauSuaChua { get; set; } = new List<YeuCauSuaChua>();

        public virtual TaiKhoan? TaiKhoan { get; set; }
    }

    [Table("phuHuynhLienHe")]
    public class PhuHuynhLienHe
    {
        [Key]
        [MaxLength(20)]
        [Column("maPhuHuynh")]
        public string MaPhuHuynh { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maSinhVien")]
        public string MaSinhVien { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("hoTen")]
        public string HoTen { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        [Column("quanHe")]
        public string QuanHe { get; set; } = string.Empty;

        [Required]
        [MaxLength(15)]
        [Column("dienThoai")]
        public string DienThoai { get; set; } = string.Empty;

        [Column("laLienHeKhanCap")]
        public bool LaLienHeKhanCap { get; set; } = false;

        [ForeignKey(nameof(MaSinhVien))]
        public virtual SinhVien? SinhVien { get; set; }
    }
}

