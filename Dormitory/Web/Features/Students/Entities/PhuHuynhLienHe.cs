using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Students.Entities
{
    [Table("phuHuynhLienHe")]
    public class PhuHuynhLienHe
    {
        [Key]
        [MaxLength(20)]
        [Column("maPhuHuynh")]
        public string MaPhuHuynh { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maSinhVien")]
        public string MaSinhVien { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("hoTen")]
        public string HoTen { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        [Column("quanHe")]
        public string QuanHe { get; set; } = string.Empty;

        [Required]
        [MaxLength(15)]
        [Column("dienThoai")]
        public string DienThoai { get; set; } = string.Empty;

        [Column("laLienHeKhanCap")]
        public bool LaLienHeKhanCap { get; set; } = false;

        [ForeignKey(nameof(MaSinhVien))]
        public virtual SinhVien? SinhVien { get; set; }
    }
}

