using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Students.Entities
{
    [Table("thongBao")]
    public class ThongBao
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("maThongBao")]
        public int MaThongBao { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maSinhVien")]
        public string MaSinhVien { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        [Column("tieuDe")]
        public string TieuDe { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        [Column("noiDung")]
        public string NoiDung { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        [Column("loai")]
        public string Loai { get; set; } = "chung";

        [MaxLength(50)]
        [Column("lienKet")]
        public string? LienKet { get; set; }

        [Column("daDoc")]
        public bool DaDoc { get; set; } = false;

        [Column("ngayTao")]
        public DateTime NgayTao { get; set; } = DateTime.Now;

        [ForeignKey(nameof(MaSinhVien))]
        public virtual SinhVien? SinhVien { get; set; }
    }
}
