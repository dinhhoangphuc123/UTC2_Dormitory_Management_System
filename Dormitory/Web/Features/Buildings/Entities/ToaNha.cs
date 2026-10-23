using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Buildings.Entities
{
    [Table("toaNha")]
    public class ToaNha
    {
        [Key]
        [MaxLength(10)]
        [Column("maToaNha")]
        public string MaToaNha { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("tenToaNha")]
        public string TenToaNha { get; set; } = string.Empty;

        [Column("soTang")]
        public int SoTang { get; set; }

        [Required]
        [MaxLength(10)]
        [Column("gioiTinhQuyDinh")]
        public string GioiTinhQuyDinh { get; set; } = "nam";

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "hoatDong";

        public virtual ICollection<Phong> DanhSachPhong { get; set; } = new List<Phong>();
        public virtual ICollection<NhanVien> DanhSachNhanVienPhuTrach { get; set; } = new List<NhanVien>();
    }
}

