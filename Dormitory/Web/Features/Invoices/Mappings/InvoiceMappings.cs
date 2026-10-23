using Dormitory.Web.Features.Invoices.DTOs;
using Dormitory.Web.Features.Invoices.Entities;

namespace Dormitory.Web.Features.Invoices.Mappings
{
    public static class InvoiceMappings
    {
        public static InvoiceItemDto ToInvoiceItemDto(this HoaDon h)
        {
            var hd = h.HopDong;
            var sv = hd?.SinhVien;
            var phong = hd?.Giuong?.Phong;
            var bld = phong?.MaToaNha ?? "A1";

            string roomLabel = phong != null ? $"{phong.MaToaNha}-{phong.MaPhong.Split('_').Last()}" : "A2-304";
            string stName = sv?.HoTen ?? "Trần Minh Hoàng";
            string stId = sv?.MaSinhVien ?? "72DCHT21045";

            bool isPaid = h.TrangThai == "daThanhToan" || (h.DanhSachThanhToan != null && h.DanhSachThanhToan.Any());
            bool isOverdue = !isPaid && h.HanThanhToan < DateTime.Today;

            string stCode = isPaid ? "paid" : (isOverdue ? "overdue" : "pending");
            string stLabel = isPaid ? "Đã nộp" : (isOverdue ? "Nợ quá hạn" : "Chờ nộp");

            string cat = "tonghop";
            string catColor = "#375ba9";
            if (h.MaHoaDon.Contains("DN")) { cat = "diennuoc"; catColor = "#0b2a5b"; }
            else if (h.MaHoaDon.Contains("PH")) { cat = "phong"; catColor = "#88a9fd"; }
            else if (h.MaHoaDon.Contains("GX")) { cat = "guixe"; catColor = "#747780"; }

            var latestPayment = h.DanhSachThanhToan?.OrderByDescending(t => t.NgayThanhToan).FirstOrDefault();
            string method = isPaid ? (latestPayment?.PhuongThuc switch
            {
                "chuyenKhoan" => "Chuyển khoản",
                "viDienTu" => "VNPAY QR",
                _ => "Tiền mặt"
            }) : "Chưa có";

            string methodIcon = method switch
            {
                "Chuyển khoản" => "account_balance",
                "VNPAY QR" => "qr_code_2",
                "Tiền mặt" => "payments",
                _ => ""
            };

            return new InvoiceItemDto
            {
                Id = h.MaHoaDon,
                Code = h.MaHoaDon,
                Room = roomLabel,
                Building = bld,
                StudentName = stName,
                StudentId = stId,
                Title = $"Tổng hợp T{h.Thang:D2}/{h.Nam} (Phòng + Dịch vụ)",
                Category = cat,
                CategoryColor = catColor,
                Amount = 1480000,
                DueDate = h.HanThanhToan.ToString("dd/MM/yyyy"),
                IsOverdue = isOverdue,
                OverdueText = isOverdue ? $"Quá {(DateTime.Today - h.HanThanhToan).Days} ngày" : null,
                Method = method,
                MethodIcon = methodIcon,
                Status = stCode,
                StatusLabel = stLabel
            };
        }
    }
}

