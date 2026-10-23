using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Violations.Entities
{
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

        [Column("ngayViPham", TypeName = "date")]
        public DateTime NgayViPham { get; set; } = DateTime.Today;

        [MaxLength(255)]
        [Column("noiDung")]
        public string? NoiDung { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("hinhThucXuLy")]
        public string HinhThucXuLy { get; set; } = "nhacNho";

        [MaxLength(20)]
        [Column("maNhanVienLap")]
        public string? MaNhanVienLap { get; set; }

        [NotMapped]
        public DateTime NgayLap { get; set; } = DateTime.Now;

        [ForeignKey(nameof(MaSinhVien))]
        public virtual SinhVien? SinhVien { get; set; }

        [ForeignKey(nameof(MaLoaiViPham))]
        public virtual LoaiViPham? LoaiViPham { get; set; }

        [ForeignKey(nameof(MaNhanVienLap))]
        public virtual NhanVien? NhanVienLap { get; set; }
    }
}

