using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Registrations.Entities
{
    [Table("dotDangKy")]
    public class DotDangKy
    {
        [Key]
        [MaxLength(20)]
        [Column("maDotDangKy")]
        public string MaDotDangKy { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("tenDot")]
        public string TenDot { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maKyHoc")]
        public string MaKyHoc { get; set; } = string.Empty;

        [Required]
        [Column("ngayMo", TypeName = "date")]
        public DateTime NgayMo { get; set; }

        [Required]
        [Column("ngayDong", TypeName = "date")]
        public DateTime NgayDong { get; set; }

        [ForeignKey(nameof(MaKyHoc))]
        public virtual KyHoc? KyHoc { get; set; }

        public virtual ICollection<DonDangKy> DanhSachDonDangKy { get; set; } = new List<DonDangKy>();
    }
}
