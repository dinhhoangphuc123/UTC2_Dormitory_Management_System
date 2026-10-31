using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.Staff.Entities;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Features.Utilities.Entities;

namespace Dormitory.Web.Features.Contracts.Entities
{
    [Table("hopDong")]
    public class HopDong
    {
        [Key]
        [MaxLength(20)]
        [Column("maHopDong")]
        public string MaHopDong { get; set; } = string.Empty;

        [MaxLength(20)]
        [Column("maDonDangKy")]
        public string? MaDonDangKy { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maSinhVien")]
        public string MaSinhVien { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maGiuong")]
        public string MaGiuong { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maKyHoc")]
        public string MaKyHoc { get; set; } = string.Empty;

        [Required]
        [Column("ngayBatDau", TypeName = "date")]
        public DateTime NgayBatDau { get; set; }

        [Required]
        [Column("ngayKetThuc", TypeName = "date")]
        public DateTime NgayKetThuc { get; set; }

        [Column("ngayNhanPhongThucTe", TypeName = "date")]
        public DateTime? NgayNhanPhongThucTe { get; set; }

        [Column("ngayTraPhongThucTe", TypeName = "date")]
        public DateTime? NgayTraPhongThucTe { get; set; }

        [Column("giaThueThang", TypeName = "decimal(12,2)")]
        public decimal GiaThueThang { get; set; }

        [Column("tienCoc", TypeName = "decimal(12,2)")]
        public decimal TienCoc { get; set; } = 0;

        [Column("phanTramMienGiam", TypeName = "decimal(5,2)")]
        public decimal PhanTramMienGiam { get; set; } = 0;

        [Column("hanGiuCho")]
        public DateTime? HanGiuCho { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = "hieuLuc";

        [Column("ngayThanhLy", TypeName = "date")]
        public DateTime? NgayThanhLy { get; set; }

        [MaxLength(20)]
        [Column("maNhanVienLap")]
        public string? MaNhanVienLap { get; set; }

        [NotMapped]
        public DateTime NgayLap { get; set; } = DateTime.Now;

        [MaxLength(255)]
        [Column("lyDoThanhLy")]
        public string? GhiChu { get; set; }

        [ForeignKey(nameof(MaDonDangKy))]
        public virtual DonDangKy? DonDangKy { get; set; }

        [ForeignKey(nameof(MaSinhVien))]
        public virtual SinhVien? SinhVien { get; set; }

        [ForeignKey(nameof(MaGiuong))]
        public virtual Giuong? Giuong { get; set; }

        [ForeignKey(nameof(MaKyHoc))]
        public virtual KyHoc? KyHoc { get; set; }

        [ForeignKey(nameof(MaNhanVienLap))]
        public virtual NhanVien? NhanVienLap { get; set; }

        public virtual ICollection<DangKyDichVu> DanhSachDangKyDichVu { get; set; } = new List<DangKyDichVu>();
        public virtual ICollection<HoaDon> DanhSachHoaDon { get; set; } = new List<HoaDon>();
    }
}
