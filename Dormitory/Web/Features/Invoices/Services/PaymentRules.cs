namespace Dormitory.Web.Features.Invoices.Services
{
    /// <summary>
    /// Quy tắc thanh toán dùng chung cho cả HoaDonService và ThanhToanService,
    /// tránh hai nơi phân tích phương thức và tính tổng theo hai kiểu khác nhau.
    /// </summary>
    public static class PaymentRules
    {
        public static string? NormalizePaymentMethod(string? paymentMethod)
        {
            var method = (paymentMethod ?? string.Empty).ToLowerInvariant().Replace(" ", "").Replace("-", "");
            if (method.Contains("vnpay") || method.Contains("vidientu") || method.Contains("víđiệntử"))
                return "viDienTu";
            if (method.Contains("chuyenkhoan") || method.Contains("chuyểnkhoản"))
                return "chuyenKhoan";
            if (method.Contains("tienmat") || method.Contains("tiềnmặt"))
                return "tienMat";
            return null;
        }

        public static decimal CalculateInvoiceTotal(
            IEnumerable<(decimal? ThanhTien, decimal SoLuong, decimal DonGia)> lines) =>
            lines.Sum(d => d.ThanhTien ?? d.SoLuong * d.DonGia);

        public static decimal CalculateOutstanding(decimal invoiceTotal, decimal paidTotal) =>
            Math.Max(0, invoiceTotal - paidTotal);
    }
}
