using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Maintenance.Entities
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
        public string TinhTrang { get; set; } = "tot";

        [Column("ngayCap", TypeName = "date")]
        public DateTime? NgayCap { get; set; }

        [ForeignKey(nameof(MaPhong))]
        public virtual Phong? Phong { get; set; }

        public virtual ICollection<YeuCauSuaChua> DanhSachYeuCauSuaChua { get; set; } = new List<YeuCauSuaChua>();
    }
}

