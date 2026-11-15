using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dormitory.Web.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceApprovalWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "lyDoTuChoi",
                table: "dangKyDichVu",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "maNhanVienDuyet",
                table: "dangKyDichVu",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ngayDuyet",
                table: "dangKyDichVu",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "trangThai",
                table: "dangKyDichVu",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            // Đăng ký dịch vụ cũ (trước khi có workflow duyệt) được coi là đang sử dụng
            migrationBuilder.Sql("UPDATE dangKyDichVu SET trangThai = 'dangDung' WHERE trangThai = '';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "lyDoTuChoi",
                table: "dangKyDichVu");

            migrationBuilder.DropColumn(
                name: "maNhanVienDuyet",
                table: "dangKyDichVu");

            migrationBuilder.DropColumn(
                name: "ngayDuyet",
                table: "dangKyDichVu");

            migrationBuilder.DropColumn(
                name: "trangThai",
                table: "dangKyDichVu");
        }
    }
}
