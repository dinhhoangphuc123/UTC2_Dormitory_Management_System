using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Utilities.Entities
{
    [Table("dangKyDichVu")]
    public class DangKyDichVu
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("maDangKyDV")]
        public int MaDangKyDV { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maHopDong")]
        public string MaHopDong { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maDichVu")]
        public string MaDichVu { get; set; } = string.Empty;

        [Column("soLuong")]
        public int SoLuong { get; set; } = 1;

        [Required]
        [Column("ngayBatDau", TypeName = "date")]
        public DateTime NgayBatDau { get; set; }

        [Column("ngayKetThuc", TypeName = "date")]
        public DateTime? NgayKetThuc { get; set; }

        [ForeignKey(nameof(MaHopDong))]
        public virtual HopDong? HopDong { get; set; }

        [ForeignKey(nameof(MaDichVu))]
        public virtual DichVu? DichVu { get; set; }
    }
}

