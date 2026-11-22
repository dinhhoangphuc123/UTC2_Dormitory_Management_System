using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dormitory.Web.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentProofRejection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "lyDoTuChoiMinhChung",
                table: "hoaDon",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ngayTuChoiMinhChung",
                table: "hoaDon",
                type: "datetime",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "lyDoTuChoiMinhChung",
                table: "hoaDon");

            migrationBuilder.DropColumn(
                name: "ngayTuChoiMinhChung",
                table: "hoaDon");
        }
    }
}
