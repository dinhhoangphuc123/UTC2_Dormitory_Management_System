using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Maintenance.Entities
{
    [Table("yeuCauSuaChua")]
    public class YeuCauSuaChua
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("maYeuCau")]
        public int MaYeuCau { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maPhong")]
        public string MaPhong { get; set; } = string.Empty;

        [MaxLength(20)]
        [Column("maTaiSan")]
        public string? MaTaiSan { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maSinhVienGui")]
        public string MaSinhVienGui { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        [Column("moTa")]
        public string MoTa { get; set; } = string.Empty;

        [Column("ngayGui")]
        public DateTime NgayGui { get; set; } = DateTime.Now;

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "moiGui";

        [MaxLength(20)]
        [Column("maNhanVienXuLy")]
        public string? MaNhanVienXuLy { get; set; }

        [Column("ngayHoanThanh")]
        public DateTime? NgayHoanThanh { get; set; }

        [ForeignKey(nameof(MaPhong))]
        public virtual Phong? Phong { get; set; }

        [ForeignKey(nameof(MaTaiSan))]
        public virtual TaiSanPhong? TaiSanPhong { get; set; }

        [ForeignKey(nameof(MaSinhVienGui))]
        public virtual SinhVien? SinhVienGui { get; set; }

        [ForeignKey(nameof(MaNhanVienXuLy))]
        public virtual NhanVien? NhanVienXuLy { get; set; }
    }
}

