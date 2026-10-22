using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Quan_ly_Ky_tuc_xa.Models.Entities
{
    [Table("namHoc")]
    public class NamHoc
    {
        [Key]
        [MaxLength(20)]
        [Column("maNamHoc")]
        public string MaNamHoc { get; set; } = string.Empty;

        [Required]
        [Column("ngayBatDau", TypeName = "date")]
        public DateTime NgayBatDau { get; set; }

        [Required]
        [Column("ngayKetThuc", TypeName = "date")]
        public DateTime NgayKetThuc { get; set; }

        [Column("laDangHoat")]
        public bool LaDangHoat { get; set; } = true;

        public virtual ICollection<KyHoc> DanhSachKyHoc { get; set; } = new List<KyHoc>();
    }

    [Table("kyHoc")]
    public class KyHoc
    {
        [Key]
        [MaxLength(20)]
        [Column("maKyHoc")]
        public string MaKyHoc { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maNamHoc")]
        public string MaNamHoc { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("tenKyHoc")]
        public string TenKyHoc { get; set; } = string.Empty;

        [Required]
        [Column("ngayBatDau", TypeName = "date")]
        public DateTime NgayBatDau { get; set; }

        [Required]
        [Column("ngayKetThuc", TypeName = "date")]
        public DateTime NgayKetThuc { get; set; }

        [ForeignKey(nameof(MaNamHoc))]
        public virtual NamHoc? NamHoc { get; set; }

        public virtual ICollection<DotDangKy> DanhSachDotDangKy { get; set; } = new List<DotDangKy>();
        public virtual ICollection<HopDong> DanhSachHopDong { get; set; } = new List<HopDong>();
    }

    [Table("lopHoc")]
    public class LopHoc
    {
        [Key]
        [MaxLength(20)]
        [Column("maLop")]
        public string MaLop { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("tenLop")]
        public string TenLop { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("tenKhoa")]
        public string TenKhoa { get; set; } = string.Empty;

        [Column("nienKhoa")]
        public int NienKhoa { get; set; }

        public virtual ICollection<SinhVien> DanhSachSinhVien { get; set; } = new List<SinhVien>();
    }
}

