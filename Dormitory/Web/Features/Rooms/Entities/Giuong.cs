using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Rooms.Entities
{
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

