using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dormitory.Web.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceSendAndPaymentProof : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "anhMinhChung",
                table: "thanhToan",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "anhMinhChung",
                table: "hoaDon",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ngayGui",
                table: "hoaDon",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ngayNopMinhChung",
                table: "hoaDon",
                type: "datetime",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "anhMinhChung",
                table: "thanhToan");

            migrationBuilder.DropColumn(
                name: "anhMinhChung",
                table: "hoaDon");

            migrationBuilder.DropColumn(
                name: "ngayGui",
                table: "hoaDon");

            migrationBuilder.DropColumn(
                name: "ngayNopMinhChung",
                table: "hoaDon");
        }
    }
}
