-- ============================================================
-- DATABASE QUẢN LÝ KÝ TÚC XÁ (Phiên bản tinh gọn 25 bảng)
-- Chuẩn hóa cho đồ án C# WinForms + SQL Server
-- ============================================================

CREATE DATABASE DO_AN_QUAN_LY_KTX;
GO
USE DO_AN_QUAN_LY_KTX;
GO

-- ============================================================
-- NHÓM 1: THỜI GIAN & DANH MỤC GỐC (03 bảng)
-- ============================================================

CREATE TABLE namHoc (
    maNamHoc       NVARCHAR(20) PRIMARY KEY,
    ngayBatDau     DATE NOT NULL,
    ngayKetThuc    DATE NOT NULL,
    laDangHoat     BIT NOT NULL DEFAULT 1,
    CHECK (ngayKetThuc > ngayBatDau)
);

CREATE TABLE kyHoc (
    maKyHoc        NVARCHAR(20) PRIMARY KEY,
    maNamHoc       NVARCHAR(20) NOT NULL,
    tenKyHoc       NVARCHAR(20) NOT NULL,
    ngayBatDau     DATE NOT NULL,
    ngayKetThuc    DATE NOT NULL,
    FOREIGN KEY (maNamHoc) REFERENCES namHoc(maNamHoc),
    UNIQUE (maNamHoc, tenKyHoc),
    CHECK (ngayKetThuc > ngayBatDau)
);

-- Tối ưu: Đưa trực tiếp tên khoa vào lớp học, giảm bớt bảng khoa
CREATE TABLE lopHoc (
    maLop          NVARCHAR(20) PRIMARY KEY,
    tenLop         NVARCHAR(100) NOT NULL,
    tenKhoa        NVARCHAR(100) NOT NULL, -- Gộp dữ liệu khoa vào đây
    nienKhoa       INT NOT NULL
);

-- ============================================================
-- NHÓM 2: SINH VIÊN & NGƯỜI THÂN (02 bảng)
-- ============================================================

CREATE TABLE sinhVien (
    maSinhVien     NVARCHAR(20) PRIMARY KEY,
    hoTen          NVARCHAR(100) NOT NULL,
    ngaySinh       DATE NOT NULL,
    gioiTinh       NVARCHAR(10) NOT NULL CHECK (gioiTinh IN (N'nam', N'nu', N'khac')),
    cccd           NVARCHAR(20) NOT NULL UNIQUE,
    dienThoai      NVARCHAR(15),
    email          NVARCHAR(100),
    diaChiThuongTru NVARCHAR(255),
    maLop          NVARCHAR(20) NOT NULL,
    namNhapHoc     INT NOT NULL,
    doiTuongUuTien NVARCHAR(50) NULL,
    trangThai      NVARCHAR(20) NOT NULL DEFAULT N'dangHoc'
                   CHECK (trangThai IN (N'dangHoc', N'baoLuu', N'totNghiep', N'thoiHoc')),
    FOREIGN KEY (maLop) REFERENCES lopHoc(maLop)
);

CREATE TABLE phuHuynhLienHe (
    maPhuHuynh     NVARCHAR(20) PRIMARY KEY,
    maSinhVien     NVARCHAR(20) NOT NULL,
    hoTen          NVARCHAR(100) NOT NULL,
    quanHe         NVARCHAR(30) NOT NULL,
    dienThoai      NVARCHAR(15) NOT NULL,
    laLienHeKhanCap BIT NOT NULL DEFAULT 0,
    FOREIGN KEY (maSinhVien) REFERENCES sinhVien(maSinhVien)
);

-- ============================================================
-- NHÓM 3: CƠ SỞ VẬT CHẤT & GIƯỜNG Ở (04 bảng)
-- ============================================================

CREATE TABLE toaNha (
    maToaNha       NVARCHAR(10) PRIMARY KEY,
    tenToaNha      NVARCHAR(100) NOT NULL,
    soTang         INT NOT NULL CHECK (soTang > 0),
    gioiTinhQuyDinh NVARCHAR(10) NOT NULL CHECK (gioiTinhQuyDinh IN (N'nam', N'nu', N'honHop')),
    trangThai      NVARCHAR(20) NOT NULL DEFAULT N'hoatDong'
                   CHECK (trangThai IN (N'hoatDong', N'baoTri', N'ngung'))
);

-- Tối ưu: Đưa giaThueThang cố định trực tiếp vào loại phòng để giảm bớt bảng bảng giá
CREATE TABLE loaiPhong (
    maLoaiPhong    NVARCHAR(20) PRIMARY KEY,
    tenLoaiPhong   NVARCHAR(50) NOT NULL UNIQUE,
    soNguoiToiDa   INT NOT NULL CHECK (soNguoiToiDa > 0),
    giaThueThang   DECIMAL(12,2) NOT NULL CHECK (giaThueThang >= 0), -- Gộp giá phòng cơ bản vào đây
    coDieuHoa      BIT NOT NULL DEFAULT 0,
    coNhaVeSinhRieng BIT NOT NULL DEFAULT 0
);

CREATE TABLE phong (
    maPhong        NVARCHAR(20) PRIMARY KEY,
    maToaNha       NVARCHAR(10) NOT NULL,
    maLoaiPhong    NVARCHAR(20) NOT NULL,
    soTang         INT NOT NULL CHECK (soTang > 0),
    trangThai      NVARCHAR(20) NOT NULL DEFAULT N'hoatDong'
                   CHECK (trangThai IN (N'hoatDong', N'baoTri', N'ngung')),
    FOREIGN KEY (maToaNha) REFERENCES toaNha(maToaNha),
    FOREIGN KEY (maLoaiPhong) REFERENCES loaiPhong(maLoaiPhong)
);

CREATE TABLE giuong (
    maGiuong       NVARCHAR(20) PRIMARY KEY,
    maPhong        NVARCHAR(20) NOT NULL,
    soThuTu        INT NOT NULL CHECK (soThuTu > 0),
    laDangHoat     BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (maPhong) REFERENCES phong(maPhong),
    UNIQUE (maPhong, soThuTu)
);

-- ============================================================
-- NHÓM 4: NHÂN SỰ & TÀI KHOẢN ĐĂNG NHẬP WINFORM (03 bảng)
-- ============================================================

CREATE TABLE nhanVien (
    maNhanVien     NVARCHAR(20) PRIMARY KEY,
    hoTen          NVARCHAR(100) NOT NULL,
    chucVu         NVARCHAR(50) NOT NULL,
    dienThoai      NVARCHAR(15),
    email          NVARCHAR(100),
    maToaNhaPhuTrach NVARCHAR(10) NULL,
    trangThai      NVARCHAR(20) NOT NULL DEFAULT N'dangLam'
                   CHECK (trangThai IN (N'dangLam', N'nghiViec')),
    FOREIGN KEY (maToaNhaPhuTrach) REFERENCES toaNha(maToaNha)
);

CREATE TABLE vaiTro (
    maVaiTro       NVARCHAR(20) PRIMARY KEY,
    tenVaiTro      NVARCHAR(50) NOT NULL UNIQUE -- admin, quanLy, keToan, sinhVien
);

-- Tối ưu: Loại bỏ bảng chức năng và phân quyền chi tiết, phân quyền trực tiếp bằng mã Vai trò trong code C#
CREATE TABLE taiKhoan (
    tenDangNhap    NVARCHAR(50) PRIMARY KEY,
    matKhauHash    NVARCHAR(255) NOT NULL,
    maVaiTro       NVARCHAR(20) NOT NULL,
    maNhanVien     NVARCHAR(20) NULL,
    maSinhVien     NVARCHAR(20) NULL,
    laDangHoat     BIT NOT NULL DEFAULT 1,
    lanDangNhapCuoi DATETIME NULL,
    FOREIGN KEY (maVaiTro) REFERENCES vaiTro(maVaiTro),
    FOREIGN KEY (maNhanVien) REFERENCES nhanVien(maNhanVien),
    FOREIGN KEY (maSinhVien) REFERENCES sinhVien(maSinhVien),
    CHECK ((maNhanVien IS NOT NULL AND maSinhVien IS NULL)
        OR (maNhanVien IS NULL AND maSinhVien IS NOT NULL))
);

-- ============================================================
-- NHÓM 5: ĐĂNG KÝ & HỢP ĐỒNG THUÊ GIƯỜNG (03 bảng)
-- ============================================================

CREATE TABLE dotDangKy (
    maDotDangKy    NVARCHAR(20) PRIMARY KEY,
    tenDot         NVARCHAR(100) NOT NULL,
    maKyHoc        NVARCHAR(20) NOT NULL,
    ngayMo         DATE NOT NULL,
    ngayDong       DATE NOT NULL,
    FOREIGN KEY (maKyHoc) REFERENCES kyHoc(maKyHoc),
    CHECK (ngayDong >= ngayMo)
);

CREATE TABLE donDangKy (
    maDonDangKy    NVARCHAR(20) PRIMARY KEY,
    maSinhVien     NVARCHAR(20) NOT NULL,
    maDotDangKy    NVARCHAR(20) NOT NULL,
    maLoaiPhong    NVARCHAR(20) NOT NULL,
    ngayDangKy     DATETIME NOT NULL DEFAULT GETDATE(),
    trangThai      NVARCHAR(20) NOT NULL DEFAULT N'choDuyet'
                   CHECK (trangThai IN (N'choDuyet', N'daDuyet', N'tuChoi', N'daHuy')),
    maNhanVienDuyet NVARCHAR(20) NULL,
    ngayDuyet      DATETIME NULL,
    ghiChu         NVARCHAR(255) NULL,
    FOREIGN KEY (maSinhVien) REFERENCES sinhVien(maSinhVien),
    FOREIGN KEY (maDotDangKy) REFERENCES dotDangKy(maDotDangKy),
    FOREIGN KEY (maLoaiPhong) REFERENCES loaiPhong(maLoaiPhong),
    FOREIGN KEY (maNhanVienDuyet) REFERENCES nhanVien(maNhanVien),
    UNIQUE (maSinhVien, maDotDangKy)
);

CREATE TABLE hopDong (
    maHopDong      NVARCHAR(20) PRIMARY KEY,
    maDonDangKy    NVARCHAR(20) NULL,
    maSinhVien     NVARCHAR(20) NOT NULL,
    maGiuong       NVARCHAR(20) NOT NULL,
    maKyHoc        NVARCHAR(20) NOT NULL,
    ngayBatDau     DATE NOT NULL,
    ngayKetThuc    DATE NOT NULL,
    ngayNhanPhongThucTe DATE NULL, -- Dùng để quét đếm số ngày ở thực tế khi tính toán chia tiền
    ngayTraPhongThucTe  DATE NULL,  
    giaThueThang   DECIMAL(12,2) NOT NULL CHECK (giaThueThang >= 0),
    tienCoc        DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tienCoc >= 0),
    phanTramMienGiam DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (phanTramMienGiam BETWEEN 0 AND 100),
    trangThai      NVARCHAR(20) NOT NULL DEFAULT N'hieuLuc'
                   CHECK (trangThai IN (N'hieuLuc', N'daKetThuc', N'daHuy')),
    ngayThanhLy    DATE NULL,
    lyDoThanhLy    NVARCHAR(255) NULL,
    maNhanVienLap  NVARCHAR(20) NOT NULL,
    FOREIGN KEY (maDonDangKy) REFERENCES donDangKy(maDonDangKy),
    FOREIGN KEY (maSinhVien) REFERENCES sinhVien(maSinhVien),
    FOREIGN KEY (maGiuong) REFERENCES giuong(maGiuong),
    FOREIGN KEY (maKyHoc) REFERENCES kyHoc(maKyHoc),
    FOREIGN KEY (maNhanVienLap) REFERENCES nhanVien(maNhanVien),
    CHECK (ngayKetThuc > ngayBatDau)
);

CREATE UNIQUE INDEX UX_hopDong_giuong_hieuLuc ON hopDong(maGiuong)   WHERE trangThai = N'hieuLuc';
CREATE UNIQUE INDEX UX_hopDong_sinhVien_hieuLuc ON hopDong(maSinhVien) WHERE trangThai = N'hieuLuc';

-- ============================================================
-- NHÓM 6: ĐIỆN NƯỚC, DỊCH VỤ & HÓA ĐƠN ĐÓNG TIỀN (10 bảng)
-- ============================================================

CREATE TABLE taiSanPhong (
    maTaiSan       NVARCHAR(20) PRIMARY KEY,
    maPhong        NVARCHAR(20) NOT NULL,
    tenTaiSan      NVARCHAR(100) NOT NULL,
    soLuong        INT NOT NULL DEFAULT 1 CHECK (soLuong > 0),
    tinhTrang      NVARCHAR(20) NOT NULL DEFAULT N'tot'
                   CHECK (tinhTrang IN (N'tot', N'hong', N'matMat', N'thanhLy')),
    ngayCap        DATE NULL,
    FOREIGN KEY (maPhong) REFERENCES phong(maPhong)
);

CREATE TABLE yeuCauSuaChua (
    maYeuCau       INT IDENTITY PRIMARY KEY,
    maPhong        NVARCHAR(20) NOT NULL,
    maTaiSan       NVARCHAR(20) NULL,
    maSinhVienGui  NVARCHAR(20) NOT NULL,
    moTa           NVARCHAR(500) NOT NULL,
    ngayGui        DATETIME NOT NULL DEFAULT GETDATE(),
    trangThai      NVARCHAR(20) NOT NULL DEFAULT N'moiGui'
                   CHECK (trangThai IN (N'moiGui', N'dangXuLy', N'hoanThanh', N'tuChoi')),
    maNhanVienXuLy NVARCHAR(20) NULL,
    ngayHoanThanh  DATETIME NULL,
    FOREIGN KEY (maPhong) REFERENCES phong(maPhong),
    FOREIGN KEY (maTaiSan) REFERENCES taiSanPhong(maTaiSan),
    FOREIGN KEY (maSinhVienGui) REFERENCES sinhVien(maSinhVien),
    FOREIGN KEY (maNhanVienXuLy) REFERENCES nhanVien(maNhanVien)
);
CREATE TABLE loaiViPham (
maLoaiViPham   NVARCHAR(20) PRIMARY KEY,
tenLoaiViPham  NVARCHAR(100) NOT NULL UNIQUE,
mucDo          NVARCHAR(20) NOT NULL CHECK (mucDo IN (N'nhe', N'trungBinh', N'nang')),
tienPhat       DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tienPhat >= 0)
);
CREATE TABLE viPham (
maViPham       INT IDENTITY PRIMARY KEY,
maSinhVien     NVARCHAR(20) NOT NULL,
maLoaiViPham   NVARCHAR(20) NOT NULL,
ngayViPham     DATE NOT NULL,
noiDung        NVARCHAR(MAX) NULL,
hinhThucXuLy   NVARCHAR(30) NOT NULL
CHECK (hinhThucXuLy IN (N'nhacNho', N'phatTien', N'canhCao', N'buocRaKhoi')),
maNhanVienLap  NVARCHAR(20) NOT NULL,
FOREIGN KEY (maSinhVien) REFERENCES sinhVien(maSinhVien),
FOREIGN KEY (maLoaiViPham) REFERENCES loaiViPham(maLoaiViPham),
FOREIGN KEY (maNhanVienLap) REFERENCES nhanVien(maNhanVien)
);
CREATE TABLE dichVu (
maDichVu       NVARCHAR(20) PRIMARY KEY,
tenDichVu      NVARCHAR(100) NOT NULL,
donViTinh      NVARCHAR(20) NOT NULL, -- thang, luot, kwh...
donGia         DECIMAL(12,2) NOT NULL CHECK (donGia >= 0),
laDangHoat     BIT NOT NULL DEFAULT 1
);
CREATE TABLE dangKyDichVu (
maDangKyDV     INT IDENTITY PRIMARY KEY,
maHopDong      NVARCHAR(20) NOT NULL,
maDichVu       NVARCHAR(20) NOT NULL,
soLuong        INT NOT NULL DEFAULT 1 CHECK (soLuong > 0),
ngayBatDau     DATE NOT NULL,
ngayKetThuc    DATE NULL,
FOREIGN KEY (maHopDong) REFERENCES hopDong(maHopDong),
FOREIGN KEY (maDichVu) REFERENCES dichVu(maDichVu),
CHECK (ngayKetThuc IS NULL OR ngayKetThuc >= ngayBatDau)
);
CREATE TABLE giaDienNuoc (
maGia          NVARCHAR(20) PRIMARY KEY,
loai           NVARCHAR(10) NOT NULL CHECK (loai IN (N'dien', N'nuoc')),
gia            DECIMAL(10,2) NOT NULL CHECK (gia >= 0),
ngayApDung     DATE NOT NULL,
ngayHetHieuLuc DATE NULL,
UNIQUE (loai, ngayApDung)
);
CREATE TABLE chiSoDienNuoc (
maChiSo        INT IDENTITY PRIMARY KEY,
maPhong        NVARCHAR(20) NOT NULL,
loai           NVARCHAR(10) NOT NULL CHECK (loai IN (N'dien', N'nuoc')),
thang          INT NOT NULL CHECK (thang BETWEEN 1 AND 12),
nam            INT NOT NULL,
chiSoCu        DECIMAL(10,2) NOT NULL CHECK (chiSoCu >= 0),
chiSoMoi       DECIMAL(10,2) NOT NULL,
maGia          NVARCHAR(20) NOT NULL,
ngayGhi        DATE NOT NULL,
maNhanVienGhi  NVARCHAR(20) NOT NULL,
FOREIGN KEY (maPhong) REFERENCES phong(maPhong),
FOREIGN KEY (maGia) REFERENCES giaDienNuoc(maGia),
FOREIGN KEY (maNhanVienGhi) REFERENCES nhanVien(maNhanVien),
UNIQUE (maPhong, loai, thang, nam),
CHECK (chiSoMoi >= chiSoCu)
);
-- GIỮ LẠI ĐỂ ĂN ĐIỂM: Hóa đơn phòng (Chốt tổng tiền phòng trước khi rã nhánh về cá nhân sinh viên)
CREATE TABLE hoaDonPhong (
maHoaDonPhong  NVARCHAR(20) PRIMARY KEY,
maPhong        NVARCHAR(20) NOT NULL,
thang          INT NOT NULL CHECK (thang BETWEEN 1 AND 12),
nam            INT NOT NULL,
tongTienDien   DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tongTienDien >= 0),
tongTienNuoc   DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tongTienNuoc >= 0),
soSinhVienGánh INT NOT NULL CHECK (soSinhVienGánh > 0),
trangThaiXuLy  BIT NOT NULL DEFAULT 0, -- 1 = Đã chia tiền thành công về hóa đơn cá nhân
FOREIGN KEY (maPhong) REFERENCES phong(maPhong),
UNIQUE (maPhong, thang, nam)
);
CREATE TABLE hoaDon (
maHoaDon       NVARCHAR(20) PRIMARY KEY,
maHopDong      NVARCHAR(20) NOT NULL,
thang          INT NOT NULL CHECK (thang BETWEEN 1 AND 12),
nam            INT NOT NULL,
ngayLap        DATE NOT NULL DEFAULT GETDATE(),
hanThanhToan   DATE NOT NULL,
trangThai      NVARCHAR(20) NOT NULL DEFAULT N'chuaThanhToan'
CHECK (trangThai IN (N'chuaThanhToan', N'daThanhToan', N'daHuy')),
FOREIGN KEY (maHopDong) REFERENCES hopDong(maHopDong),
UNIQUE (maHopDong, thang, nam)
);
CREATE TABLE chiTietHoaDon (
maChiTiet      INT IDENTITY PRIMARY KEY,
maHoaDon       NVARCHAR(20) NOT NULL,
loaiKhoan      NVARCHAR(20) NOT NULL
CHECK (loaiKhoan IN (N'tienPhong', N'dien', N'nuoc', N'dichVu', N'phat', N'khac')),
maDichVu       NVARCHAR(20) NULL,
maHoaDonPhong  NVARCHAR(20) NULL, -- Khóa ngoại liên kết ngược về hóa đơn tổng phòng
maViPham       INT NULL,
dienGiai       NVARCHAR(255) NULL,
soLuong        DECIMAL(10,2) NOT NULL DEFAULT 1,
donGia         DECIMAL(12,2) NOT NULL,
thanhTien      AS (CONVERT(DECIMAL(14,2), soLuong * donGia)) PERSISTED,
FOREIGN KEY (maHoaDon) REFERENCES hoaDon(maHoaDon),
FOREIGN KEY (maDichVu) REFERENCES dichVu(maDichVu),
FOREIGN KEY (maHoaDonPhong) REFERENCES hoaDonPhong(maHoaDonPhong),
FOREIGN KEY (maViPham) REFERENCES viPham(maViPham)
);
CREATE TABLE thanhToan (
maThanhToan    NVARCHAR(20) PRIMARY KEY,
maHoaDon       NVARCHAR(20) NOT NULL,
soTien         DECIMAL(12,2) NOT NULL CHECK (soTien > 0),
ngayThanhToan  DATETIME NOT NULL DEFAULT GETDATE(),
phuongThuc     NVARCHAR(20) NOT NULL
CHECK (phuongThuc IN (N'tienMat', N'chuyenKhoan', N'viDienTu')),
maNhanVienThu  NVARCHAR(20) NULL,
ghiChu         NVARCHAR(255) NULL,
FOREIGN KEY (maHoaDon) REFERENCES hoaDon(maHoaDon),
FOREIGN KEY (maNhanVienThu) REFERENCES nhanVien(maNhanVien)
);
GO