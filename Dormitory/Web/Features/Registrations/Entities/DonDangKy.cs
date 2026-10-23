using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dormitory.Web.Features.Registrations.Entities
{
    [Table("donDangKy")]
    public class DonDangKy
    {
        [Key]
        [MaxLength(20)]
        [Column("maDonDangKy")]
        public string MaDonDangKy { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maSinhVien")]
        public string MaSinhVien { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maDotDangKy")]
        public string MaDotDangKy { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maLoaiPhong")]
        public string MaLoaiPhong { get; set; } = string.Empty;

        [Column("ngayDangKy")]
        public DateTime NgayDangKy { get; set; } = DateTime.Now;

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "choDuyet";

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

        [ForeignKey(nameof(MaDotDangKy))]
        public virtual DotDangKy? DotDangKy { get; set; }

        [ForeignKey(nameof(MaLoaiPhong))]
        public virtual LoaiPhong? LoaiPhong { get; set; }

        [ForeignKey(nameof(MaNhanVienDuyet))]
        public virtual NhanVien? NhanVienDuyet { get; set; }

        public virtual ICollection<HopDong> DanhSachHopDong { get; set; } = new List<HopDong>();
    }
}

