using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Accounts.Entities
{
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

