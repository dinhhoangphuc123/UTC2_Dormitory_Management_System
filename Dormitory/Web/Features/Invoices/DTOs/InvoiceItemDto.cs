namespace Dormitory.Web.Features.Invoices.DTOs
{
    public class InvoiceItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Room { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string StudentId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = "tonghop"; // tonghop, phong, diennuoc, guixe
        public string CategoryColor { get; set; } = "#375ba9";
        public decimal Amount { get; set; }
        public string DueDate { get; set; } = string.Empty;
        public bool IsOverdue { get; set; }
        public string? OverdueText { get; set; }
        public string Method { get; set; } = "Chưa có";
        public string MethodIcon { get; set; } = string.Empty;
        public string Status { get; set; } = "pending"; // draft, pending, paid, overdue
        public string StatusLabel { get; set; } = "Chưa thanh toán";

        // Trạng thái thu phí đồng bộ với Đợt & Đơn đăng ký: nhap, chuaThanhToan, choXacNhan, daNhanThanhToan
        public string PaymentStatus { get; set; } = "chuaThanhToan";

        // Hóa đơn nháp chưa gửi sinh viên, chỉ BQL thấy và được sửa.
        public bool IsDraft { get; set; }
        public bool CanEdit { get; set; }

        // Trạng thái gửi hóa đơn cho sinh viên
        public bool IsSent { get; set; }
        public string? DateSent { get; set; }

        // Minh chứng do sinh viên nộp, chờ BQL đối soát
        public bool HasStudentProof { get; set; }
        public string? ProofSubmittedAt { get; set; }
        // BQL đã từ chối minh chứng: chờ sinh viên nộp lại, không còn ở trạng thái "chờ đối soát".
        public bool IsProofRejected { get; set; }
        public string? ProofRejectReason { get; set; }
        public string? ProofRejectedAt { get; set; }
    }
}
