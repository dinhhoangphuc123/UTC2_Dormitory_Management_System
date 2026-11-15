using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dormitory.Web.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCheckConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_chiSoDienNuoc_nonneg') ALTER TABLE chiSoDienNuoc ADD CONSTRAINT CK_chiSoDienNuoc_nonneg CHECK (chiSoCu >= 0 AND chiSoMoi >= 0);");
            migrationBuilder.Sql("IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_chiTietHoaDon_amounts') ALTER TABLE chiTietHoaDon ADD CONSTRAINT CK_chiTietHoaDon_amounts CHECK (soLuong >= 0 AND donGia >= 0 AND (thanhTien IS NULL OR thanhTien >= 0));");
            migrationBuilder.Sql("IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_hoaDonPhong_amounts') ALTER TABLE hoaDonPhong ADD CONSTRAINT CK_hoaDonPhong_amounts CHECK (tongTien >= 0);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
