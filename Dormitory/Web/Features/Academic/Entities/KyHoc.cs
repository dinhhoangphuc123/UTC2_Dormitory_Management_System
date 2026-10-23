using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Academic.Entities
{
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
}

