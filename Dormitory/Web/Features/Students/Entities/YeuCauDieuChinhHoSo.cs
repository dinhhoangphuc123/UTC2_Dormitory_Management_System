using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Dormitory.Web.Features.Staff.Entities;

namespace Dormitory.Web.Features.Students.Entities
{
    [Table("yeuCauDieuChinhHoSo")]
    public class YeuCauDieuChinhHoSo
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("maYeuCau")]
        public int MaYeuCau { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maSinhVien")]
        public string MaSinhVien { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        [Column("truong")]
        public string Truong { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("giaTriMoi")]
        public string GiaTriMoi { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("lyDo")]
        public string LyDo { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "choDuyet";

        [Column("ngayGui")]
        public DateTime NgayGui { get; set; } = DateTime.Now;

        [MaxLength(20)]
        [Column("maNhanVienDuyet")]
        public string? MaNhanVienDuyet { get; set; }

        [Column("ngayDuyet")]
        public DateTime? NgayDuyet { get; set; }

        [MaxLength(255)]
        [Column("ghiChu")]
        public string? GhiChu { get; set; }

        [ForeignKey(nameof(MaSinhVien))]
        public virtual SinhVien? SinhVien { get; set; }

        [ForeignKey(nameof(MaNhanVienDuyet))]
        public virtual NhanVien? NhanVienDuyet { get; set; }
    }
}
