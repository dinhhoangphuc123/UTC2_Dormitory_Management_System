-- ============================================================
-- Migration: 001_student_portal.sql
-- Mục đích: Hỗ trợ quy trình đăng ký nội trú 4 bước và cổng sinh viên
-- Đảm bảo tính idempotent: có thể chạy lại nhiều lần không lỗi
-- ============================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. BẢNG donDangKy: thêm maPhong, cho phép maLoaiPhong NULL, cập nhật CHECK trangThai
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('donDangKy') AND name = 'maPhong'
)
BEGIN
    ALTER TABLE donDangKy ADD maPhong NVARCHAR(20) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = 'FK_donDangKy_phong' AND parent_object_id = OBJECT_ID('donDangKy')
)
BEGIN
    ALTER TABLE donDangKy 
    ADD CONSTRAINT FK_donDangKy_phong FOREIGN KEY (maPhong) REFERENCES phong(maPhong);
END
GO

-- Cho phép maLoaiPhong NULL (đơn mới xác định loại phòng qua phòng đã chọn)
ALTER TABLE donDangKy ALTER COLUMN maLoaiPhong NVARCHAR(20) NULL;
GO

-- Cập nhật CHECK constraint trên donDangKy.trangThai
DECLARE @chkDonDangKy NVARCHAR(256);
SELECT @chkDonDangKy = c.name 
FROM sys.check_constraints c
JOIN sys.columns col ON c.parent_object_id = col.object_id AND c.parent_column_id = col.column_id
WHERE c.parent_object_id = OBJECT_ID('donDangKy') AND col.name = 'trangThai';

IF @chkDonDangKy IS NOT NULL
BEGIN
    EXEC('ALTER TABLE donDangKy DROP CONSTRAINT [' + @chkDonDangKy + '];');
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID('donDangKy') AND name = 'CK_donDangKy_trangThai'
)
BEGIN
    ALTER TABLE donDangKy ADD CONSTRAINT CK_donDangKy_trangThai 
    CHECK (trangThai IN (N'choDuyet', N'daDuyet', N'tuChoi', N'daHuy', N'hetHan'));
END
GO

-- 2. BẢNG hopDong: thêm hanGiuCho, cập nhật CHECK trangThai, cập nhật Filtered Indexes
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('hopDong') AND name = 'hanGiuCho'
)
BEGIN
    ALTER TABLE hopDong ADD hanGiuCho DATETIME NULL;
END
GO

-- Cập nhật CHECK constraint trên hopDong.trangThai
DECLARE @chkHopDong NVARCHAR(256);
SELECT @chkHopDong = c.name 
FROM sys.check_constraints c
JOIN sys.columns col ON c.parent_object_id = col.object_id AND c.parent_column_id = col.column_id
WHERE c.parent_object_id = OBJECT_ID('hopDong') AND col.name = 'trangThai';

IF @chkHopDong IS NOT NULL
BEGIN
    EXEC('ALTER TABLE hopDong DROP CONSTRAINT [' + @chkHopDong + '];');
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID('hopDong') AND name = 'CK_hopDong_trangThai'
)
BEGIN
    ALTER TABLE hopDong ADD CONSTRAINT CK_hopDong_trangThai 
    CHECK (trangThai IN (N'hieuLuc', N'daKetThuc', N'daHuy', N'choThanhToan'));
END
GO

-- Cập nhật filtered indexes cho hopDong
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_hopDong_giuong_hieuLuc' AND object_id = OBJECT_ID('hopDong'))
BEGIN
    DROP INDEX UX_hopDong_giuong_hieuLuc ON hopDong;
END
GO

CREATE UNIQUE INDEX UX_hopDong_giuong_hieuLuc 
ON hopDong(maGiuong) 
WHERE trangThai <> N'daKetThuc' AND trangThai <> N'daHuy';
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_hopDong_sinhVien_hieuLuc' AND object_id = OBJECT_ID('hopDong'))
BEGIN
    DROP INDEX UX_hopDong_sinhVien_hieuLuc ON hopDong;
END
GO

CREATE UNIQUE INDEX UX_hopDong_sinhVien_hieuLuc 
ON hopDong(maSinhVien) 
WHERE trangThai <> N'daKetThuc' AND trangThai <> N'daHuy';
GO

-- 3. BẢNG yeuCauSuaChua: thêm các cột phục vụ cổng sinh viên
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('yeuCauSuaChua') AND name = 'loaiSuCo'
)
BEGIN
    ALTER TABLE yeuCauSuaChua ADD loaiSuCo NVARCHAR(30) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('yeuCauSuaChua') AND name = 'mucDoKhanCap'
)
BEGIN
    ALTER TABLE yeuCauSuaChua ADD mucDoKhanCap NVARCHAR(20) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID('yeuCauSuaChua') AND name = 'CK_yeuCauSuaChua_mucDoKhanCap'
)
BEGIN
    ALTER TABLE yeuCauSuaChua ADD CONSTRAINT CK_yeuCauSuaChua_mucDoKhanCap 
    CHECK (mucDoKhanCap IS NULL OR mucDoKhanCap IN (N'binhThuong', N'khanCap'));
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('yeuCauSuaChua') AND name = 'phanHoi'
)
BEGIN
    ALTER TABLE yeuCauSuaChua ADD phanHoi NVARCHAR(500) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('yeuCauSuaChua') AND name = 'anhMinhHoa'
)
BEGIN
    ALTER TABLE yeuCauSuaChua ADD anhMinhHoa NVARCHAR(255) NULL;
END
GO

-- 4. BẢNG thongBao
IF OBJECT_ID('thongBao', 'U') IS NULL
BEGIN
    CREATE TABLE thongBao (
        maThongBao INT IDENTITY(1,1) PRIMARY KEY,
        maSinhVien NVARCHAR(20) NOT NULL,
        tieuDe NVARCHAR(150) NOT NULL,
        noiDung NVARCHAR(500) NOT NULL,
        loai NVARCHAR(30) NOT NULL 
            CONSTRAINT CK_thongBao_loai CHECK (loai IN (N'donDangKy', N'thanhToan', N'nhacHan', N'baoTri', N'chung')),
        lienKet NVARCHAR(50) NULL,
        daDoc BIT NOT NULL CONSTRAINT DF_thongBao_daDoc DEFAULT 0,
        ngayTao DATETIME NOT NULL CONSTRAINT DF_thongBao_ngayTao DEFAULT GETDATE(),
        CONSTRAINT FK_thongBao_sinhVien FOREIGN KEY (maSinhVien) REFERENCES sinhVien(maSinhVien)
    );
END
GO

-- 5. BẢNG yeuCauDieuChinhHoSo
IF OBJECT_ID('yeuCauDieuChinhHoSo', 'U') IS NULL
BEGIN
    CREATE TABLE yeuCauDieuChinhHoSo (
        maYeuCau INT IDENTITY(1,1) PRIMARY KEY,
        maSinhVien NVARCHAR(20) NOT NULL,
        truong NVARCHAR(30) NOT NULL,
        giaTriMoi NVARCHAR(255) NOT NULL,
        lyDo NVARCHAR(255) NOT NULL,
        trangThai NVARCHAR(20) NOT NULL 
            CONSTRAINT DF_yeuCauDieuChinh_trangThai DEFAULT N'choDuyet'
            CONSTRAINT CK_yeuCauDieuChinh_trangThai CHECK (trangThai IN (N'choDuyet', N'daDuyet', N'tuChoi')),
        ngayGui DATETIME NOT NULL CONSTRAINT DF_yeuCauDieuChinh_ngayGui DEFAULT GETDATE(),
        maNhanVienDuyet NVARCHAR(20) NULL,
        ngayDuyet DATETIME NULL,
        ghiChu NVARCHAR(255) NULL,
        CONSTRAINT FK_yeuCauDieuChinh_sinhVien FOREIGN KEY (maSinhVien) REFERENCES sinhVien(maSinhVien),
        CONSTRAINT FK_yeuCauDieuChinh_nhanVien FOREIGN KEY (maNhanVienDuyet) REFERENCES nhanVien(maNhanVien)
    );
END
GO
