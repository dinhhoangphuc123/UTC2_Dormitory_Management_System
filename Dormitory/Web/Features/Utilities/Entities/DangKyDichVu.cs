using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Dormitory.Web.Shared.Constants;

namespace Dormitory.Web.Features.Utilities.Entities
{
    [Table("dangKyDichVu")]
    public class DangKyDichVu
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("maDangKyDV")]
        public int MaDangKyDV { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("maHopDong")]
        public string MaHopDong { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("maDichVu")]
        public string MaDichVu { get; set; } = string.Empty;

        [Column("soLuong")]
        public int SoLuong { get; set; } = 1;

        [Required]
        [Column("ngayBatDau", TypeName = "date")]
        public DateTime NgayBatDau { get; set; }

        [Column("ngayKetThuc", TypeName = "date")]
        public DateTime? NgayKetThuc { get; set; }

        // Workflow duyệt: choDuyet -> dangDung (BQL duyệt) hoặc daTuChoi; sinh viên/BQL hủy thì daHuy.
        [Required]
        [MaxLength(20)]
        [Column("trangThai")]
        public string TrangThai { get; set; } = AppDefaults.ServicePending;

        [MaxLength(20)]
        [Column("maNhanVienDuyet")]
        public string? MaNhanVienDuyet { get; set; }

        [Column("ngayDuyet", TypeName = "datetime")]
        public DateTime? NgayDuyet { get; set; }

        [MaxLength(200)]
        [Column("lyDoTuChoi")]
        public string? LyDoTuChoi { get; set; }

        [ForeignKey(nameof(MaHopDong))]
        public virtual HopDong? HopDong { get; set; }

        [ForeignKey(nameof(MaDichVu))]
        public virtual DichVu? DichVu { get; set; }
    }
}

