using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dormitory.Web.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "dichVu",
                columns: table => new
                {
                    maDichVu = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    tenDichVu = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    donViTinh = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    donGia = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    laDangHoat = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dichVu", x => x.maDichVu);
                });

            migrationBuilder.CreateTable(
                name: "giaDienNuoc",
                columns: table => new
                {
                    maGia = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    loai = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    gia = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    ngayApDung = table.Column<DateTime>(type: "date", nullable: false),
                    ngayHetHieuLuc = table.Column<DateTime>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_giaDienNuoc", x => x.maGia);
                });

            migrationBuilder.CreateTable(
                name: "loaiPhong",
                columns: table => new
                {
                    maLoaiPhong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    tenLoaiPhong = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    soNguoiToiDa = table.Column<int>(type: "int", nullable: false),
                    giaThueThang = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    coDieuHoa = table.Column<bool>(type: "bit", nullable: false),
                    coNhaVeSinhRieng = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_loaiPhong", x => x.maLoaiPhong);
                });

            migrationBuilder.CreateTable(
                name: "loaiViPham",
                columns: table => new
                {
                    maLoaiViPham = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    tenLoaiViPham = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    mucDo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    tienPhat = table.Column<decimal>(type: "decimal(12,2)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_loaiViPham", x => x.maLoaiViPham);
                });

            migrationBuilder.CreateTable(
                name: "lopHoc",
                columns: table => new
                {
                    maLop = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    tenLop = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    tenKhoa = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    nienKhoa = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lopHoc", x => x.maLop);
                });

            migrationBuilder.CreateTable(
                name: "maDatLaiMatKhau",
                columns: table => new
                {
                    maDatLai = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    dinhDanh = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    maHash = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    hetHan = table.Column<DateTime>(type: "datetime2", nullable: false),
                    soLanSai = table.Column<int>(type: "int", nullable: false),
                    daXacMinh = table.Column<bool>(type: "bit", nullable: false),
                    ngayTao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_maDatLaiMatKhau", x => x.maDatLai);
                });

            migrationBuilder.CreateTable(
                name: "namHoc",
                columns: table => new
                {
                    maNamHoc = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ngayBatDau = table.Column<DateTime>(type: "date", nullable: false),
                    ngayKetThuc = table.Column<DateTime>(type: "date", nullable: false),
                    laDangHoat = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_namHoc", x => x.maNamHoc);
                });

            migrationBuilder.CreateTable(
                name: "toaNha",
                columns: table => new
                {
                    maToaNha = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    tenToaNha = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    soTang = table.Column<int>(type: "int", nullable: false),
                    gioiTinhQuyDinh = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    trangThai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_toaNha", x => x.maToaNha);
                });

            migrationBuilder.CreateTable(
                name: "vaiTro",
                columns: table => new
                {
                    maVaiTro = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    tenVaiTro = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vaiTro", x => x.maVaiTro);
                });

            migrationBuilder.CreateTable(
                name: "sinhVien",
                columns: table => new
                {
                    maSinhVien = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    hoTen = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ngaySinh = table.Column<DateTime>(type: "date", nullable: false),
                    gioiTinh = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    cccd = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    dienThoai = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: true),
                    email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    diaChiThuongTru = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    maLop = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    namNhapHoc = table.Column<int>(type: "int", nullable: false),
                    doiTuongUuTien = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    trangThai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sinhVien", x => x.maSinhVien);
                    table.ForeignKey(
                        name: "FK_sinhVien_lopHoc_maLop",
                        column: x => x.maLop,
                        principalTable: "lopHoc",
                        principalColumn: "maLop",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "kyHoc",
                columns: table => new
                {
                    maKyHoc = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maNamHoc = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    tenKyHoc = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ngayBatDau = table.Column<DateTime>(type: "date", nullable: false),
                    ngayKetThuc = table.Column<DateTime>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_kyHoc", x => x.maKyHoc);
                    table.ForeignKey(
                        name: "FK_kyHoc_namHoc_maNamHoc",
                        column: x => x.maNamHoc,
                        principalTable: "namHoc",
                        principalColumn: "maNamHoc",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "nhanVien",
                columns: table => new
                {
                    maNhanVien = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    hoTen = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    chucVu = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    dienThoai = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: true),
                    email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    maToaNhaPhuTrach = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    trangThai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_nhanVien", x => x.maNhanVien);
                    table.ForeignKey(
                        name: "FK_nhanVien_toaNha_maToaNhaPhuTrach",
                        column: x => x.maToaNhaPhuTrach,
                        principalTable: "toaNha",
                        principalColumn: "maToaNha");
                });

            migrationBuilder.CreateTable(
                name: "phong",
                columns: table => new
                {
                    maPhong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maToaNha = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    maLoaiPhong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    soTang = table.Column<int>(type: "int", nullable: false),
                    trangThai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_phong", x => x.maPhong);
                    table.ForeignKey(
                        name: "FK_phong_loaiPhong_maLoaiPhong",
                        column: x => x.maLoaiPhong,
                        principalTable: "loaiPhong",
                        principalColumn: "maLoaiPhong",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_phong_toaNha_maToaNha",
                        column: x => x.maToaNha,
                        principalTable: "toaNha",
                        principalColumn: "maToaNha",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "phuHuynhLienHe",
                columns: table => new
                {
                    maPhuHuynh = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maSinhVien = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    hoTen = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    quanHe = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    dienThoai = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: false),
                    laLienHeKhanCap = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_phuHuynhLienHe", x => x.maPhuHuynh);
                    table.ForeignKey(
                        name: "FK_phuHuynhLienHe_sinhVien_maSinhVien",
                        column: x => x.maSinhVien,
                        principalTable: "sinhVien",
                        principalColumn: "maSinhVien",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "thongBao",
                columns: table => new
                {
                    maThongBao = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    maSinhVien = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    tieuDe = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    noiDung = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    loai = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    lienKet = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    daDoc = table.Column<bool>(type: "bit", nullable: false),
                    ngayTao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_thongBao", x => x.maThongBao);
                    table.ForeignKey(
                        name: "FK_thongBao_sinhVien_maSinhVien",
                        column: x => x.maSinhVien,
                        principalTable: "sinhVien",
                        principalColumn: "maSinhVien",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dotDangKy",
                columns: table => new
                {
                    maDotDangKy = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    tenDot = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    maKyHoc = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ngayMo = table.Column<DateTime>(type: "date", nullable: false),
                    ngayDong = table.Column<DateTime>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dotDangKy", x => x.maDotDangKy);
                    table.ForeignKey(
                        name: "FK_dotDangKy_kyHoc_maKyHoc",
                        column: x => x.maKyHoc,
                        principalTable: "kyHoc",
                        principalColumn: "maKyHoc",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "taiKhoan",
                columns: table => new
                {
                    tenDangNhap = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    matKhauHash = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    maVaiTro = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maNhanVien = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    maSinhVien = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    laDangHoat = table.Column<bool>(type: "bit", nullable: false),
                    lanDangNhapCuoi = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_taiKhoan", x => x.tenDangNhap);
                    table.ForeignKey(
                        name: "FK_taiKhoan_nhanVien_maNhanVien",
                        column: x => x.maNhanVien,
                        principalTable: "nhanVien",
                        principalColumn: "maNhanVien",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_taiKhoan_sinhVien_maSinhVien",
                        column: x => x.maSinhVien,
                        principalTable: "sinhVien",
                        principalColumn: "maSinhVien",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_taiKhoan_vaiTro_maVaiTro",
                        column: x => x.maVaiTro,
                        principalTable: "vaiTro",
                        principalColumn: "maVaiTro",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "viPham",
                columns: table => new
                {
                    maViPham = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    maSinhVien = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maLoaiViPham = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ngayViPham = table.Column<DateTime>(type: "date", nullable: false),
                    noiDung = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    hinhThucXuLy = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maNhanVienLap = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_viPham", x => x.maViPham);
                    table.ForeignKey(
                        name: "FK_viPham_loaiViPham_maLoaiViPham",
                        column: x => x.maLoaiViPham,
                        principalTable: "loaiViPham",
                        principalColumn: "maLoaiViPham",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_viPham_nhanVien_maNhanVienLap",
                        column: x => x.maNhanVienLap,
                        principalTable: "nhanVien",
                        principalColumn: "maNhanVien");
                    table.ForeignKey(
                        name: "FK_viPham_sinhVien_maSinhVien",
                        column: x => x.maSinhVien,
                        principalTable: "sinhVien",
                        principalColumn: "maSinhVien",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "yeuCauDieuChinhHoSo",
                columns: table => new
                {
                    maYeuCau = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    maSinhVien = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    truong = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    giaTriMoi = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    lyDo = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    trangThai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ngayGui = table.Column<DateTime>(type: "datetime2", nullable: false),
                    maNhanVienDuyet = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ngayDuyet = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ghiChu = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_yeuCauDieuChinhHoSo", x => x.maYeuCau);
                    table.ForeignKey(
                        name: "FK_yeuCauDieuChinhHoSo_nhanVien_maNhanVienDuyet",
                        column: x => x.maNhanVienDuyet,
                        principalTable: "nhanVien",
                        principalColumn: "maNhanVien");
                    table.ForeignKey(
                        name: "FK_yeuCauDieuChinhHoSo_sinhVien_maSinhVien",
                        column: x => x.maSinhVien,
                        principalTable: "sinhVien",
                        principalColumn: "maSinhVien",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "chiSoDienNuoc",
                columns: table => new
                {
                    maChiSo = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    maPhong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    loai = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    thang = table.Column<int>(type: "int", nullable: false),
                    nam = table.Column<int>(type: "int", nullable: false),
                    chiSoCu = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    chiSoMoi = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    maGia = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ngayGhi = table.Column<DateTime>(type: "datetime2", nullable: false),
                    maNhanVienGhi = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chiSoDienNuoc", x => x.maChiSo);
                    table.ForeignKey(
                        name: "FK_chiSoDienNuoc_giaDienNuoc_maGia",
                        column: x => x.maGia,
                        principalTable: "giaDienNuoc",
                        principalColumn: "maGia",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_chiSoDienNuoc_nhanVien_maNhanVienGhi",
                        column: x => x.maNhanVienGhi,
                        principalTable: "nhanVien",
                        principalColumn: "maNhanVien");
                    table.ForeignKey(
                        name: "FK_chiSoDienNuoc_phong_maPhong",
                        column: x => x.maPhong,
                        principalTable: "phong",
                        principalColumn: "maPhong",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "giuong",
                columns: table => new
                {
                    maGiuong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maPhong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    soThuTu = table.Column<int>(type: "int", nullable: false),
                    laDangHoat = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_giuong", x => x.maGiuong);
                    table.ForeignKey(
                        name: "FK_giuong_phong_maPhong",
                        column: x => x.maPhong,
                        principalTable: "phong",
                        principalColumn: "maPhong",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "hoaDonPhong",
                columns: table => new
                {
                    maHoaDonPhong = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    maPhong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    thang = table.Column<int>(type: "int", nullable: false),
                    nam = table.Column<int>(type: "int", nullable: false),
                    tienDien = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    tienNuoc = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    tongTien = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    soNguoiChia = table.Column<int>(type: "int", nullable: false),
                    tienMoiNguoi = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    trangThai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ngayTao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hoaDonPhong", x => x.maHoaDonPhong);
                    table.ForeignKey(
                        name: "FK_hoaDonPhong_phong_maPhong",
                        column: x => x.maPhong,
                        principalTable: "phong",
                        principalColumn: "maPhong",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "taiSanPhong",
                columns: table => new
                {
                    maTaiSan = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maPhong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    tenTaiSan = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    soLuong = table.Column<int>(type: "int", nullable: false),
                    tinhTrang = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ngayCap = table.Column<DateTime>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_taiSanPhong", x => x.maTaiSan);
                    table.ForeignKey(
                        name: "FK_taiSanPhong_phong_maPhong",
                        column: x => x.maPhong,
                        principalTable: "phong",
                        principalColumn: "maPhong",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "donDangKy",
                columns: table => new
                {
                    maDonDangKy = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maSinhVien = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maDotDangKy = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maLoaiPhong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    maPhong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ngayDangKy = table.Column<DateTime>(type: "datetime2", nullable: false),
                    trangThai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maNhanVienDuyet = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ngayDuyet = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ghiChu = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_donDangKy", x => x.maDonDangKy);
                    table.ForeignKey(
                        name: "FK_donDangKy_dotDangKy_maDotDangKy",
                        column: x => x.maDotDangKy,
                        principalTable: "dotDangKy",
                        principalColumn: "maDotDangKy",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_donDangKy_loaiPhong_maLoaiPhong",
                        column: x => x.maLoaiPhong,
                        principalTable: "loaiPhong",
                        principalColumn: "maLoaiPhong");
                    table.ForeignKey(
                        name: "FK_donDangKy_nhanVien_maNhanVienDuyet",
                        column: x => x.maNhanVienDuyet,
                        principalTable: "nhanVien",
                        principalColumn: "maNhanVien");
                    table.ForeignKey(
                        name: "FK_donDangKy_phong_maPhong",
                        column: x => x.maPhong,
                        principalTable: "phong",
                        principalColumn: "maPhong");
                    table.ForeignKey(
                        name: "FK_donDangKy_sinhVien_maSinhVien",
                        column: x => x.maSinhVien,
                        principalTable: "sinhVien",
                        principalColumn: "maSinhVien",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "yeuCauSuaChua",
                columns: table => new
                {
                    maYeuCau = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    maPhong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maTaiSan = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    maSinhVienGui = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    moTa = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    loaiSuCo = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    mucDoKhanCap = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    phanHoi = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    anhMinhHoa = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ngayGui = table.Column<DateTime>(type: "datetime2", nullable: false),
                    trangThai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maNhanVienXuLy = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ngayHoanThanh = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_yeuCauSuaChua", x => x.maYeuCau);
                    table.ForeignKey(
                        name: "FK_yeuCauSuaChua_nhanVien_maNhanVienXuLy",
                        column: x => x.maNhanVienXuLy,
                        principalTable: "nhanVien",
                        principalColumn: "maNhanVien");
                    table.ForeignKey(
                        name: "FK_yeuCauSuaChua_phong_maPhong",
                        column: x => x.maPhong,
                        principalTable: "phong",
                        principalColumn: "maPhong",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_yeuCauSuaChua_sinhVien_maSinhVienGui",
                        column: x => x.maSinhVienGui,
                        principalTable: "sinhVien",
                        principalColumn: "maSinhVien",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_yeuCauSuaChua_taiSanPhong_maTaiSan",
                        column: x => x.maTaiSan,
                        principalTable: "taiSanPhong",
                        principalColumn: "maTaiSan");
                });

            migrationBuilder.CreateTable(
                name: "hopDong",
                columns: table => new
                {
                    maHopDong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maDonDangKy = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    maSinhVien = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maGiuong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maKyHoc = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ngayBatDau = table.Column<DateTime>(type: "date", nullable: false),
                    ngayKetThuc = table.Column<DateTime>(type: "date", nullable: false),
                    ngayNhanPhongThucTe = table.Column<DateTime>(type: "date", nullable: true),
                    ngayTraPhongThucTe = table.Column<DateTime>(type: "date", nullable: true),
                    giaThueThang = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    tienCoc = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    phanTramMienGiam = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    hanGiuCho = table.Column<DateTime>(type: "datetime2", nullable: true),
                    trangThai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ngayThanhLy = table.Column<DateTime>(type: "date", nullable: true),
                    maNhanVienLap = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    lyDoThanhLy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hopDong", x => x.maHopDong);
                    table.ForeignKey(
                        name: "FK_hopDong_donDangKy_maDonDangKy",
                        column: x => x.maDonDangKy,
                        principalTable: "donDangKy",
                        principalColumn: "maDonDangKy");
                    table.ForeignKey(
                        name: "FK_hopDong_giuong_maGiuong",
                        column: x => x.maGiuong,
                        principalTable: "giuong",
                        principalColumn: "maGiuong",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_hopDong_kyHoc_maKyHoc",
                        column: x => x.maKyHoc,
                        principalTable: "kyHoc",
                        principalColumn: "maKyHoc",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_hopDong_nhanVien_maNhanVienLap",
                        column: x => x.maNhanVienLap,
                        principalTable: "nhanVien",
                        principalColumn: "maNhanVien");
                    table.ForeignKey(
                        name: "FK_hopDong_sinhVien_maSinhVien",
                        column: x => x.maSinhVien,
                        principalTable: "sinhVien",
                        principalColumn: "maSinhVien",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dangKyDichVu",
                columns: table => new
                {
                    maDangKyDV = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    maHopDong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maDichVu = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    soLuong = table.Column<int>(type: "int", nullable: false),
                    ngayBatDau = table.Column<DateTime>(type: "date", nullable: false),
                    ngayKetThuc = table.Column<DateTime>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dangKyDichVu", x => x.maDangKyDV);
                    table.ForeignKey(
                        name: "FK_dangKyDichVu_dichVu_maDichVu",
                        column: x => x.maDichVu,
                        principalTable: "dichVu",
                        principalColumn: "maDichVu",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_dangKyDichVu_hopDong_maHopDong",
                        column: x => x.maHopDong,
                        principalTable: "hopDong",
                        principalColumn: "maHopDong",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "hoaDon",
                columns: table => new
                {
                    maHoaDon = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maHopDong = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    thang = table.Column<int>(type: "int", nullable: false),
                    nam = table.Column<int>(type: "int", nullable: false),
                    hanThanhToan = table.Column<DateTime>(type: "date", nullable: false),
                    trangThai = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ngayLap = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hoaDon", x => x.maHoaDon);
                    table.ForeignKey(
                        name: "FK_hoaDon_hopDong_maHopDong",
                        column: x => x.maHopDong,
                        principalTable: "hopDong",
                        principalColumn: "maHopDong",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "chiTietHoaDon",
                columns: table => new
                {
                    maChiTiet = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    maHoaDon = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    loaiKhoan = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maDichVu = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    dienGiai = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    soLuong = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    donGia = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    thanhTien = table.Column<decimal>(type: "decimal(14,2)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chiTietHoaDon", x => x.maChiTiet);
                    table.ForeignKey(
                        name: "FK_chiTietHoaDon_dichVu_maDichVu",
                        column: x => x.maDichVu,
                        principalTable: "dichVu",
                        principalColumn: "maDichVu");
                    table.ForeignKey(
                        name: "FK_chiTietHoaDon_hoaDon_maHoaDon",
                        column: x => x.maHoaDon,
                        principalTable: "hoaDon",
                        principalColumn: "maHoaDon",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "thanhToan",
                columns: table => new
                {
                    maThanhToan = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maHoaDon = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    soTien = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    ngayThanhToan = table.Column<DateTime>(type: "datetime2", nullable: false),
                    phuongThuc = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    maNhanVienThu = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ghiChu = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_thanhToan", x => x.maThanhToan);
                    table.ForeignKey(
                        name: "FK_thanhToan_hoaDon_maHoaDon",
                        column: x => x.maHoaDon,
                        principalTable: "hoaDon",
                        principalColumn: "maHoaDon",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_thanhToan_nhanVien_maNhanVienThu",
                        column: x => x.maNhanVienThu,
                        principalTable: "nhanVien",
                        principalColumn: "maNhanVien");
                });

            migrationBuilder.CreateIndex(
                name: "IX_chiSoDienNuoc_maGia",
                table: "chiSoDienNuoc",
                column: "maGia");

            migrationBuilder.CreateIndex(
                name: "IX_chiSoDienNuoc_maNhanVienGhi",
                table: "chiSoDienNuoc",
                column: "maNhanVienGhi");

            migrationBuilder.CreateIndex(
                name: "IX_chiSoDienNuoc_maPhong_loai_thang_nam",
                table: "chiSoDienNuoc",
                columns: new[] { "maPhong", "loai", "thang", "nam" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_chiTietHoaDon_maDichVu",
                table: "chiTietHoaDon",
                column: "maDichVu");

            migrationBuilder.CreateIndex(
                name: "IX_chiTietHoaDon_maHoaDon",
                table: "chiTietHoaDon",
                column: "maHoaDon");

            migrationBuilder.CreateIndex(
                name: "IX_dangKyDichVu_maDichVu",
                table: "dangKyDichVu",
                column: "maDichVu");

            migrationBuilder.CreateIndex(
                name: "IX_dangKyDichVu_maHopDong",
                table: "dangKyDichVu",
                column: "maHopDong");

            migrationBuilder.CreateIndex(
                name: "IX_donDangKy_maDotDangKy",
                table: "donDangKy",
                column: "maDotDangKy");

            migrationBuilder.CreateIndex(
                name: "IX_donDangKy_maLoaiPhong",
                table: "donDangKy",
                column: "maLoaiPhong");

            migrationBuilder.CreateIndex(
                name: "IX_donDangKy_maNhanVienDuyet",
                table: "donDangKy",
                column: "maNhanVienDuyet");

            migrationBuilder.CreateIndex(
                name: "IX_donDangKy_maPhong",
                table: "donDangKy",
                column: "maPhong");

            migrationBuilder.CreateIndex(
                name: "IX_donDangKy_maSinhVien_maDotDangKy",
                table: "donDangKy",
                columns: new[] { "maSinhVien", "maDotDangKy" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_dotDangKy_maKyHoc",
                table: "dotDangKy",
                column: "maKyHoc");

            migrationBuilder.CreateIndex(
                name: "IX_giaDienNuoc_loai_ngayApDung",
                table: "giaDienNuoc",
                columns: new[] { "loai", "ngayApDung" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_giuong_maPhong_soThuTu",
                table: "giuong",
                columns: new[] { "maPhong", "soThuTu" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_hoaDon_maHopDong_thang_nam",
                table: "hoaDon",
                columns: new[] { "maHopDong", "thang", "nam" });

            migrationBuilder.CreateIndex(
                name: "IX_hoaDonPhong_maPhong_thang_nam",
                table: "hoaDonPhong",
                columns: new[] { "maPhong", "thang", "nam" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_hopDong_maDonDangKy",
                table: "hopDong",
                column: "maDonDangKy");

            migrationBuilder.CreateIndex(
                name: "IX_hopDong_maGiuong",
                table: "hopDong",
                column: "maGiuong",
                unique: true,
                filter: "[trangThai] <> N'daKetThuc' AND [trangThai] <> N'daHuy'");

            migrationBuilder.CreateIndex(
                name: "IX_hopDong_maKyHoc",
                table: "hopDong",
                column: "maKyHoc");

            migrationBuilder.CreateIndex(
                name: "IX_hopDong_maNhanVienLap",
                table: "hopDong",
                column: "maNhanVienLap");

            migrationBuilder.CreateIndex(
                name: "IX_hopDong_maSinhVien",
                table: "hopDong",
                column: "maSinhVien",
                unique: true,
                filter: "[trangThai] <> N'daKetThuc' AND [trangThai] <> N'daHuy'");

            migrationBuilder.CreateIndex(
                name: "IX_kyHoc_maNamHoc_tenKyHoc",
                table: "kyHoc",
                columns: new[] { "maNamHoc", "tenKyHoc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_loaiPhong_tenLoaiPhong",
                table: "loaiPhong",
                column: "tenLoaiPhong",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_loaiViPham_tenLoaiViPham",
                table: "loaiViPham",
                column: "tenLoaiViPham");

            migrationBuilder.CreateIndex(
                name: "IX_lopHoc_tenLop",
                table: "lopHoc",
                column: "tenLop");

            migrationBuilder.CreateIndex(
                name: "IX_maDatLaiMatKhau_dinhDanh_ngayTao",
                table: "maDatLaiMatKhau",
                columns: new[] { "dinhDanh", "ngayTao" });

            migrationBuilder.CreateIndex(
                name: "IX_nhanVien_dienThoai",
                table: "nhanVien",
                column: "dienThoai");

            migrationBuilder.CreateIndex(
                name: "IX_nhanVien_email",
                table: "nhanVien",
                column: "email");

            migrationBuilder.CreateIndex(
                name: "IX_nhanVien_maToaNhaPhuTrach",
                table: "nhanVien",
                column: "maToaNhaPhuTrach");

            migrationBuilder.CreateIndex(
                name: "IX_phong_maLoaiPhong",
                table: "phong",
                column: "maLoaiPhong");

            migrationBuilder.CreateIndex(
                name: "IX_phong_maToaNha",
                table: "phong",
                column: "maToaNha");

            migrationBuilder.CreateIndex(
                name: "IX_phuHuynhLienHe_maSinhVien",
                table: "phuHuynhLienHe",
                column: "maSinhVien");

            migrationBuilder.CreateIndex(
                name: "IX_sinhVien_cccd",
                table: "sinhVien",
                column: "cccd",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sinhVien_maLop",
                table: "sinhVien",
                column: "maLop");

            migrationBuilder.CreateIndex(
                name: "IX_taiKhoan_maNhanVien",
                table: "taiKhoan",
                column: "maNhanVien",
                unique: true,
                filter: "[maNhanVien] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_taiKhoan_maSinhVien",
                table: "taiKhoan",
                column: "maSinhVien",
                unique: true,
                filter: "[maSinhVien] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_taiKhoan_maVaiTro",
                table: "taiKhoan",
                column: "maVaiTro");

            migrationBuilder.CreateIndex(
                name: "IX_taiSanPhong_maPhong",
                table: "taiSanPhong",
                column: "maPhong");

            migrationBuilder.CreateIndex(
                name: "IX_thanhToan_maHoaDon",
                table: "thanhToan",
                column: "maHoaDon");

            migrationBuilder.CreateIndex(
                name: "IX_thanhToan_maNhanVienThu",
                table: "thanhToan",
                column: "maNhanVienThu");

            migrationBuilder.CreateIndex(
                name: "IX_thongBao_maSinhVien",
                table: "thongBao",
                column: "maSinhVien");

            migrationBuilder.CreateIndex(
                name: "IX_toaNha_tenToaNha",
                table: "toaNha",
                column: "tenToaNha");

            migrationBuilder.CreateIndex(
                name: "IX_vaiTro_tenVaiTro",
                table: "vaiTro",
                column: "tenVaiTro",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_viPham_maLoaiViPham",
                table: "viPham",
                column: "maLoaiViPham");

            migrationBuilder.CreateIndex(
                name: "IX_viPham_maNhanVienLap",
                table: "viPham",
                column: "maNhanVienLap");

            migrationBuilder.CreateIndex(
                name: "IX_viPham_maSinhVien",
                table: "viPham",
                column: "maSinhVien");

            migrationBuilder.CreateIndex(
                name: "IX_viPham_ngayViPham",
                table: "viPham",
                column: "ngayViPham");

            migrationBuilder.CreateIndex(
                name: "IX_yeuCauDieuChinhHoSo_maNhanVienDuyet",
                table: "yeuCauDieuChinhHoSo",
                column: "maNhanVienDuyet");

            migrationBuilder.CreateIndex(
                name: "IX_yeuCauDieuChinhHoSo_maSinhVien",
                table: "yeuCauDieuChinhHoSo",
                column: "maSinhVien");

            migrationBuilder.CreateIndex(
                name: "IX_yeuCauSuaChua_maNhanVienXuLy",
                table: "yeuCauSuaChua",
                column: "maNhanVienXuLy");

            migrationBuilder.CreateIndex(
                name: "IX_yeuCauSuaChua_maPhong",
                table: "yeuCauSuaChua",
                column: "maPhong");

            migrationBuilder.CreateIndex(
                name: "IX_yeuCauSuaChua_maSinhVienGui",
                table: "yeuCauSuaChua",
                column: "maSinhVienGui");

            migrationBuilder.CreateIndex(
                name: "IX_yeuCauSuaChua_maTaiSan",
                table: "yeuCauSuaChua",
                column: "maTaiSan");

            migrationBuilder.CreateIndex(
                name: "IX_yeuCauSuaChua_trangThai",
                table: "yeuCauSuaChua",
                column: "trangThai");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chiSoDienNuoc");

            migrationBuilder.DropTable(
                name: "chiTietHoaDon");

            migrationBuilder.DropTable(
                name: "dangKyDichVu");

            migrationBuilder.DropTable(
                name: "hoaDonPhong");

            migrationBuilder.DropTable(
                name: "maDatLaiMatKhau");

            migrationBuilder.DropTable(
                name: "phuHuynhLienHe");

            migrationBuilder.DropTable(
                name: "taiKhoan");

            migrationBuilder.DropTable(
                name: "thanhToan");

            migrationBuilder.DropTable(
                name: "thongBao");

            migrationBuilder.DropTable(
                name: "viPham");

            migrationBuilder.DropTable(
                name: "yeuCauDieuChinhHoSo");

            migrationBuilder.DropTable(
                name: "yeuCauSuaChua");

            migrationBuilder.DropTable(
                name: "giaDienNuoc");

            migrationBuilder.DropTable(
                name: "dichVu");

            migrationBuilder.DropTable(
                name: "vaiTro");

            migrationBuilder.DropTable(
                name: "hoaDon");

            migrationBuilder.DropTable(
                name: "loaiViPham");

            migrationBuilder.DropTable(
                name: "taiSanPhong");

            migrationBuilder.DropTable(
                name: "hopDong");

            migrationBuilder.DropTable(
                name: "donDangKy");

            migrationBuilder.DropTable(
                name: "giuong");

            migrationBuilder.DropTable(
                name: "dotDangKy");

            migrationBuilder.DropTable(
                name: "nhanVien");

            migrationBuilder.DropTable(
                name: "sinhVien");

            migrationBuilder.DropTable(
                name: "phong");

            migrationBuilder.DropTable(
                name: "kyHoc");

            migrationBuilder.DropTable(
                name: "lopHoc");

            migrationBuilder.DropTable(
                name: "loaiPhong");

            migrationBuilder.DropTable(
                name: "toaNha");

            migrationBuilder.DropTable(
                name: "namHoc");
        }
    }
}
