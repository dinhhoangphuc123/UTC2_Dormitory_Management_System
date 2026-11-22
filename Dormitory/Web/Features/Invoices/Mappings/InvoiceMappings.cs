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
            var bld = phong?.MaToaNha ?? string.Empty;

            string roomLabel = phong != null ? $"{phong.MaToaNha}-{phong.MaPhong.Split('_').Last()}" : string.Empty;
            string stName = sv?.HoTen ?? string.Empty;
            string stId = sv?.MaSinhVien ?? string.Empty;
            decimal invoiceTotal = h.DanhSachChiTietHoaDon.Sum(d => d.ThanhTien ?? d.SoLuong * d.DonGia);

            bool isDraft = h.TrangThai == "nhap";
            bool isCancelled = h.TrangThai == "daHuy";
            bool isPaid = !isCancelled && (h.TrangThai == "daThanhToan" ||
                (invoiceTotal > 0 && h.DanhSachThanhToan.Sum(t => t.SoTien) >= invoiceTotal));
            // Nháp và đã hủy chưa gửi/không còn hiệu lực nên chưa thể quá hạn.
            bool isOverdue = !isDraft && !isCancelled && !isPaid && h.HanThanhToan < DateTime.Today;
            bool isProofRejected = !string.IsNullOrEmpty(h.LyDoTuChoiMinhChung);
            bool hasStudentProof = !string.IsNullOrEmpty(h.AnhMinhChung);
            bool isAwaitingConfirm = !isDraft && !isCancelled && !isPaid && !isProofRejected && (hasStudentProof || h.NgayNopMinhChung.HasValue);

            string stCode = isCancelled ? "cancelled" : (isDraft ? "draft" : (isPaid ? "paid" : (isOverdue ? "overdue" : "pending")));
            string paymentStatus = isCancelled
                ? "daHuy"
                : (isDraft
                    ? "nhap"
                    : (isPaid ? "daNhanThanhToan" : (isAwaitingConfirm ? "choXacNhan" : "chuaThanhToan")));
            string stLabel = isCancelled
                ? "Đã hủy"
                : (isDraft
                    ? "Nháp"
                    : (isPaid
                        ? "Đã nhận thanh toán"
                        : (isAwaitingConfirm
                            ? "Chờ xác nhận thanh toán"
                            : (isOverdue ? "Nợ quá hạn" : "Chưa thanh toán"))));

            var lineTypes = h.DanhSachChiTietHoaDon.Select(d => d.LoaiKhoan).Distinct().ToList();
            string cat = lineTypes.Count > 0 && lineTypes.All(type => type is "dien" or "nuoc")
                ? "diennuoc"
                : lineTypes.Count == 1 && lineTypes[0] == "tienPhong"
                    ? "phong"
                    : "tonghop";
            string catColor = cat == "diennuoc" ? "#0b2a5b" : (cat == "phong" ? "#88a9fd" : "#375ba9");

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
                Title = h.DanhSachChiTietHoaDon.OrderBy(d => d.MaChiTiet).Select(d => d.NoiDung).FirstOrDefault()
                    ?? $"Hóa đơn T{h.Thang:D2}/{h.Nam}",
                Category = cat,
                CategoryColor = catColor,
                Amount = invoiceTotal,
                DueDate = h.HanThanhToan.ToString("dd/MM/yyyy"),
                IsOverdue = isOverdue,
                OverdueText = isOverdue ? $"Quá {(DateTime.Today - h.HanThanhToan).Days} ngày" : null,
                Method = method,
                MethodIcon = methodIcon,
                Status = stCode,
                StatusLabel = stLabel,
                PaymentStatus = paymentStatus,
                IsDraft = isDraft,
                // Chỉ hóa đơn nháp một khoản (lập tay) mới sửa được; hóa đơn điện nước nhiều dòng phải sửa ở trang Điện nước.
                CanEdit = isDraft && (h.DanhSachChiTietHoaDon?.Count ?? 0) == 1 && (h.DanhSachThanhToan?.Count ?? 0) == 0,
                IsSent = h.NgayGui.HasValue,
                DateSent = h.NgayGui?.ToString("dd/MM/yyyy HH:mm"),
                HasStudentProof = hasStudentProof,
                ProofSubmittedAt = h.NgayNopMinhChung?.ToString("dd/MM/yyyy HH:mm"),
                IsProofRejected = isProofRejected,
                ProofRejectReason = h.LyDoTuChoiMinhChung,
                ProofRejectedAt = h.NgayTuChoiMinhChung?.ToString("dd/MM/yyyy HH:mm")
            };
        }
    }
}
