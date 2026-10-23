using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Academic.Entities
{
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

