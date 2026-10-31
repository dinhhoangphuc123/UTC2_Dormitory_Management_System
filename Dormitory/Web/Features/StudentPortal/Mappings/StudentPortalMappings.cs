using Dormitory.Web.Features.Academic.Entities;
using Dormitory.Web.Features.Buildings.Entities;
using Dormitory.Web.Features.Contracts.Entities;
using Dormitory.Web.Features.Invoices.Entities;
using Dormitory.Web.Features.Maintenance.Entities;
using Dormitory.Web.Features.Registrations.Entities;
using Dormitory.Web.Features.Registrations.Services;
using Dormitory.Web.Features.Rooms.Entities;
using Dormitory.Web.Features.StudentPortal.DTOs;
using Dormitory.Web.Features.Students.Entities;
using Dormitory.Web.Features.Utilities.Entities;
using Dormitory.Web.Features.Violations.Entities;

namespace Dormitory.Web.Features.StudentPortal.Mappings
{
    public static class StudentPortalMappings
    {
        public static StudentProfileDto ToStudentProfileDto(this SinhVien s)
        {
            return new StudentProfileDto
            {
                Mssv = s.MaSinhVien,
                HoTen = s.HoTen,
                NgaySinh = s.NgaySinh.ToString("dd/MM/yyyy"),
                GioiTinh = s.GioiTinh switch { "nu" => "Nữ", "nam" => "Nam", _ => s.GioiTinh },
                Cccd = s.Cccd,
                DienThoai = s.DienThoai,
                Email = s.Email,
                DiaChiThuongTru = s.DiaChiThuongTru,
                MaLop = s.MaLop,
                TenKhoa = s.LopHoc?.TenKhoa ?? "—",
                NamNhapHoc = s.NamNhapHoc,
                DoiTuongUuTien = s.DoiTuongUuTien ?? "—",
                TrangThai = s.TrangThai switch
                {
                    "dangHoc" => "Đang học",
                    "tamDung" => "Tạm dừng",
                    "daTotNghiep" => "Đã tốt nghiệp",
                    _ => s.TrangThai
                }
            };
        }

        public static GuardianDto ToGuardianDto(this PhuHuynhLienHe p)
        {
            return new GuardianDto
            {
                Id = p.MaPhuHuynh,
                HoTen = p.HoTen,
                QuanHe = p.QuanHe,
                DienThoai = p.DienThoai,
                LaLienHeKhanCap = p.LaLienHeKhanCap
            };
        }

        public static ProfileChangeRequestDto ToProfileChangeRequestDto(this YeuCauDieuChinhHoSo y)
        {
            return new ProfileChangeRequestDto
            {
                Id = y.MaYeuCau,
                Truong = y.Truong,
                GiaTriMoi = y.GiaTriMoi,
                LyDo = y.LyDo,
                TrangThai = y.TrangThai,
                NgayGui = y.NgayGui.ToString("dd/MM/yyyy HH:mm"),
                NgayDuyet = y.NgayDuyet?.ToString("dd/MM/yyyy HH:mm"),
                GhiChu = y.GhiChu
            };
        }

        public static RegistrationRoundDto ToRegistrationRoundDto(this DotDangKy d, bool eligible, List<string> reasons, DateTime now)
        {
            string status;
            if (d.NgayMo.Date > now.Date) status = "sapMo";
            else if (d.NgayDong.Date < now.Date) status = "daDong";
            else status = "dangMo";

            return new RegistrationRoundDto
            {
                Id = d.MaDotDangKy,
                TenDot = d.TenDot,
                MaKyHoc = d.MaKyHoc,
                NgayMo = d.NgayMo.ToString("dd/MM/yyyy"),
                NgayDong = d.NgayDong.ToString("dd/MM/yyyy"),
                Status = status,
                Eligible = eligible,
                Reasons = reasons
            };
        }

        public static StudentBuildingDto ToStudentBuildingDto(this ToaNha t, int totalRooms, int availableRooms)
        {
            return new StudentBuildingDto
            {
                Id = t.MaToaNha,
                TenToaNha = t.TenToaNha,
                GioiTinhQuyDinh = t.GioiTinhQuyDinh switch
                {
                    "nam" => "Nam",
                    "nu" => "Nữ",
                    _ => "Hỗn hợp"
                },
                SoTang = t.SoTang,
                TotalRooms = totalRooms,
                AvailableRooms = availableRooms
            };
        }

        public static StudentRoomDto ToStudentRoomDto(this Phong p, int availableBedsCount, bool selectable, string? reason)
        {
            return new StudentRoomDto
            {
                Id = p.MaPhong,
                MaPhong = p.MaPhong,
                TenLoaiPhong = p.LoaiPhong?.TenLoaiPhong ?? "—",
                GiaThueThang = p.LoaiPhong?.GiaThueThang ?? 0,
                SucChua = p.LoaiPhong?.SoNguoiToiDa ?? 0,
                AvailableBedsCount = availableBedsCount,
                Selectable = selectable,
                UnselectableReason = reason
            };
        }

        public static StudentApplicationDto ToStudentApplicationDto(this DonDangKy d, HopDong? linkedContract, DateTime now)
        {
            string state = RegistrationRules.ResolveRegistrationStep(
                d.TrangThai,
                linkedContract?.TrangThai,
                linkedContract?.HanGiuCho,
                linkedContract?.NgayNhanPhongThucTe,
                now);

            bool canPay = d.TrangThai == "daDuyet" && 
                          linkedContract != null && 
                          linkedContract.TrangThai == "choThanhToan" && 
                          (!linkedContract.HanGiuCho.HasValue || linkedContract.HanGiuCho.Value >= now);

            string? bed = linkedContract?.Giuong != null ? $"G{linkedContract.Giuong.SoThuTu}" : null;

            return new StudentApplicationDto
            {
                Id = d.MaDonDangKy,
                MaDonDangKy = d.MaDonDangKy,
                MaDotDangKy = d.MaDotDangKy,
                TenDot = d.DotDangKy?.TenDot ?? "—",
                MaPhong = d.MaPhong ?? d.Phong?.MaPhong,
                TenToaNha = d.Phong?.ToaNha?.TenToaNha,
                TenLoaiPhong = d.Phong?.LoaiPhong?.TenLoaiPhong ?? d.LoaiPhong?.TenLoaiPhong,
                GiaThueThang = d.Phong?.LoaiPhong?.GiaThueThang ?? d.LoaiPhong?.GiaThueThang,
                NgayDangKy = d.NgayDangKy.ToString("dd/MM/yyyy HH:mm"),
                State = state,
                RejectionReason = d.TrangThai == "tuChoi" ? d.GhiChu : null,
                HanGiuCho = linkedContract?.HanGiuCho?.ToString("dd/MM/yyyy HH:mm"),
                AssignedBed = bed,
                CanPay = canPay
            };
        }

        public static StudentContractDto ToStudentContractDto(this HopDong h)
        {
            var phong = h.Giuong?.Phong;
            var toa = phong?.ToaNha;

            string statusText = h.TrangThai switch
            {
                "choThanhToan" => "Chờ thanh toán",
                "hieuLuc" => "Hiệu lực",
                "daKetThuc" => "Đã thanh lý",
                "daHuy" => "Đã hủy",
                _ => h.TrangThai
            };

            return new StudentContractDto
            {
                Id = h.MaHopDong,
                MaHopDong = h.MaHopDong,
                ToaNha = toa?.TenToaNha ?? (phong?.MaToaNha ?? "—"),
                Phong = phong?.MaPhong ?? "—",
                Giuong = h.Giuong != null ? $"G{h.Giuong.SoThuTu}" : "—",
                NgayBatDau = h.NgayBatDau.ToString("dd/MM/yyyy"),
                NgayKetThuc = h.NgayKetThuc.ToString("dd/MM/yyyy"),
                NgayNhanPhongThucTe = h.NgayNhanPhongThucTe?.ToString("dd/MM/yyyy"),
                GiaThueThang = h.GiaThueThang,
                TienCoc = h.TienCoc,
                PhanTramMienGiam = h.PhanTramMienGiam,
                Status = statusText,
                StatusCode = h.TrangThai,
                CheckedIn = h.NgayNhanPhongThucTe.HasValue
            };
        }

        public static StudentInvoiceListItemDto ToStudentInvoiceListItemDto(this HoaDon hd, bool isRegistration)
        {
            decimal total = hd.DanhSachChiTietHoaDon.Sum(d => d.ThanhTien ?? d.SoLuong * d.DonGia);
            decimal paid = hd.DanhSachThanhToan.Sum(t => t.SoTien);
            decimal remaining = Math.Max(0, total - paid);

            return new StudentInvoiceListItemDto
            {
                Id = hd.MaHoaDon,
                MaHoaDon = hd.MaHoaDon,
                Thang = hd.Thang,
                Nam = hd.Nam,
                NgayLap = hd.NgayLap.ToString("dd/MM/yyyy"),
                HanThanhToan = hd.HanThanhToan.ToString("dd/MM/yyyy"),
                TrangThai = hd.TrangThai,
                TongTien = total,
                DaThanhToan = paid,
                ConLai = remaining,
                IsRegistration = isRegistration
            };
        }

        public static StudentInvoiceDetailDto ToStudentInvoiceDetailDto(this HoaDon hd, bool isRegistration)
        {
            decimal total = hd.DanhSachChiTietHoaDon.Sum(d => d.ThanhTien ?? d.SoLuong * d.DonGia);
            decimal paid = hd.DanhSachThanhToan.Sum(t => t.SoTien);
            decimal remaining = Math.Max(0, total - paid);

            return new StudentInvoiceDetailDto
            {
                Id = hd.MaHoaDon,
                MaHoaDon = hd.MaHoaDon,
                Thang = hd.Thang,
                Nam = hd.Nam,
                NgayLap = hd.NgayLap.ToString("dd/MM/yyyy"),
                HanThanhToan = hd.HanThanhToan.ToString("dd/MM/yyyy"),
                TrangThai = hd.TrangThai,
                TongTien = total,
                DaThanhToan = paid,
                ConLai = remaining,
                IsRegistration = isRegistration,
                Lines = hd.DanhSachChiTietHoaDon.Select(l => new PaymentInvoiceLineDto
                {
                    Description = !string.IsNullOrWhiteSpace(l.NoiDung) ? l.NoiDung : (l.LoaiKhoan switch
                    {
                        "tienPhong" => "Tiền phòng",
                        "dien" => "Tiền điện",
                        "nuoc" => "Tiền nước",
                        "dichVu" => "Tiền dịch vụ",
                        "phat" => "Tiền phạt",
                        _ => "Khoản thu khác"
                    }),
                    Amount = l.ThanhTien ?? l.SoLuong * l.DonGia,
                    Quantity = l.SoLuong,
                    UnitPrice = l.DonGia
                }).ToList(),
                Payments = hd.DanhSachThanhToan.Select(p => new StudentPaymentReceiptDto
                {
                    MaThanhToan = p.MaThanhToan,
                    SoTien = p.SoTien,
                    NgayThanhToan = p.NgayThanhToan.ToString("dd/MM/yyyy HH:mm"),
                    PhuongThuc = p.PhuongThuc switch
                    {
                        "chuyenKhoan" => "Chuyển khoản",
                        "viDienTu" => "Ví điện tử",
                        "tienMat" => "Tiền mặt",
                        _ => p.PhuongThuc
                    },
                    GhiChu = p.GhiChu
                }).ToList()
            };
        }

        public static StudentRegisteredServiceDto ToStudentRegisteredServiceDto(this DangKyDichVu d)
        {
            return new StudentRegisteredServiceDto
            {
                TenDichVu = d.DichVu?.TenDichVu ?? "—",
                DonGia = d.DichVu?.DonGia ?? 0,
                SoLuong = d.SoLuong,
                NgayBatDau = d.NgayBatDau.ToString("dd/MM/yyyy"),
                NgayKetThuc = d.NgayKetThuc?.ToString("dd/MM/yyyy")
            };
        }

        public static StudentMaintenanceDto ToStudentMaintenanceDto(this YeuCauSuaChua y)
        {
            string statusText = y.TrangThai switch
            {
                "moiGui" => "Đã tiếp nhận",
                "dangXuLy" => "Đang xử lý",
                "hoanThanh" => "Đã hoàn tất",
                "tuChoi" => "Bị từ chối",
                _ => y.TrangThai
            };

            return new StudentMaintenanceDto
            {
                Id = y.MaYeuCau,
                MaPhong = y.MaPhong,
                TenTaiSan = y.TaiSanPhong?.TenTaiSan,
                LoaiSuCo = y.LoaiSuCo,
                MucDoKhanCap = y.MucDoKhanCap,
                MoTa = y.MoTa,
                NgayGui = y.NgayGui.ToString("dd/MM/yyyy HH:mm"),
                TrangThai = y.TrangThai,
                TrangThaiText = statusText,
                PhanHoi = y.PhanHoi,
                HasImage = !string.IsNullOrEmpty(y.AnhMinhHoa)
            };
        }

        public static StudentViolationDto ToStudentViolationDto(this ViPham v)
        {
            return new StudentViolationDto
            {
                Id = v.MaViPham,
                TenLoaiViPham = v.LoaiViPham?.TenLoaiViPham ?? "—",
                MucDo = v.LoaiViPham?.MucDo switch
                {
                    "nhe" => "Nhẹ",
                    "trungBinh" => "Trung bình",
                    "nang" => "Nặng",
                    _ => v.LoaiViPham?.MucDo ?? "—"
                },
                NgayViPham = v.NgayViPham.ToString("dd/MM/yyyy"),
                MoTa = v.NoiDung ?? string.Empty,
                HinhThucXuLy = v.HinhThucXuLy switch
                {
                    "nhacNho" => "Nhắc nhở",
                    "canhCao" => "Cảnh cáo",
                    "buocRaKhoi" => "Buộc rời KTX",
                    _ => "Khiển trách"
                },
                TienPhat = v.LoaiViPham?.TienPhat ?? 0,
                DaNopPhat = false
            };
        }

        public static StudentNotificationDto ToStudentNotificationDto(this ThongBao t)
        {
            return new StudentNotificationDto
            {
                Id = t.MaThongBao,
                TieuDe = t.TieuDe,
                NoiDung = t.NoiDung,
                Loai = t.Loai,
                LienKet = t.LienKet,
                DaDoc = t.DaDoc,
                NgayTao = t.NgayTao.ToString("dd/MM/yyyy HH:mm")
            };
        }
    }
}
