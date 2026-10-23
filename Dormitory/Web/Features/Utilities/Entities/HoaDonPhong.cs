using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Utilities.Entities
{
    [Table("hoaDonPhong")]
    public class HoaDonPhong
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("maHoaDonPhong")]
        public int MaHoaDonPhong { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maPhong")]
        public string MaPhong { get; set; } = string.Empty;

        [Column("thang")]
        public int Thang { get; set; }

        [Column("nam")]
        public int Nam { get; set; }

        [Column("tienDien", TypeName = "decimal(12,2)")]
        public decimal TienDien { get; set; }

        [Column("tienNuoc", TypeName = "decimal(12,2)")]
        public decimal TienNuoc { get; set; }

        [Column("tongTien", TypeName = "decimal(12,2)")]
        public decimal TongTien { get; set; }

        [Column("soNguoiChia")]
        public int SoNguoiChia { get; set; }

        [Column("tienMoiNguoi", TypeName = "decimal(12,2)")]
        public decimal TienMoiNguoi { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "chuaChot";

        [Column("ngayTao")]
        public DateTime NgayTao { get; set; } = DateTime.Now;

        [ForeignKey(nameof(MaPhong))]
        public virtual Phong? Phong { get; set; }
    }
}

