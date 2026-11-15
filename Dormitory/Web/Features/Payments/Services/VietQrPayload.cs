using System.Globalization;
using System.Text;

namespace Dormitory.Web.Features.Payments.Services
{
    /// <summary>
    /// Sinh mã QR chuẩn VietQR (EMVCo + Napas) phía server để ứng dụng ngân hàng quét được
    /// mà không phụ thuộc dịch vụ ảnh bên ngoài; đồng thời tạo URL ảnh VietQR khi cần hiển thị.
    /// </summary>
    public static class VietQrPayload
    {
        // Napas BIN cho vài ngân hàng phổ biến; cấu hình app dùng tên ("VietinBank")
        // hay BIN ("970422") đều được chuẩn hoá về BIN số.
        private static readonly Dictionary<string, string> BankBins = new(StringComparer.OrdinalIgnoreCase)
        {
            { "VietinBank", "970415" },
            { "Vietcombank", "970436" },
            { "VietCapitalBank", "970427" },
            { "Techcombank", "970407" },
            { "MB", "970422" },
            { "MBBank", "970422" },
            { "MB Bank", "970422" },
            { "AgriBank", "970405" },
            { "BIDV", "970418" },
            { "VPBank", "970432" },
            { "TPBank", "970423" },
            { "Sacombank", "970403" },
            { "OCB", "970448" },
            { "MSB", "970426" },
            { "HD Bank", "970437" },
            { "HDBank", "970437" }
        };

        public static string NormalizeBankBin(string bankId)
        {
            var trimmed = (bankId ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(trimmed)) return string.Empty;
            if (trimmed.All(char.IsDigit)) return trimmed;
            return BankBins.TryGetValue(trimmed, out var bin) ? bin : trimmed;
        }

        public static bool IsConfigured(string accountNo, string bankId) =>
            !string.IsNullOrWhiteSpace(accountNo) && !string.IsNullOrWhiteSpace(NormalizeBankBin(bankId));

        /// <summary>Tạo payload EMV VietQR cho một lần thanh toán cụ thể.</summary>
        public static string BuildPayload(string bankId, string accountNo, string accountName, decimal amount, string content)
        {
            var bin = NormalizeBankBin(bankId);
            var account = (accountNo ?? string.Empty).Trim();
            var note = Clean(content, "KTXNAPAS");
            if (note.Length > 56) note = note[..56];

            var merchant = Tlv("00", "A000000727")
                + Tlv("01", "0")
                + Tlv("02", bin)
                + Tlv("03", account);

            var payload = Tlv("00", "01")
                + Tlv("01", "11")
                + Tlv("26", merchant)
                + Tlv("52", "5411")
                + Tlv("53", "704")
                + Tlv("54", amount.ToString("0", CultureInfo.InvariantCulture))
                + Tlv("58", "VN")
                + Tlv("62", Tlv("08", note))
                + "6304";

            return payload + ComputeCrc16(payload);
        }

        public static string BuildImageUrl(string bankId, string accountNo, string accountName, decimal amount, string content)
        {
            var bin = NormalizeBankBin(bankId);
            return "https://img.vietqr.io/image/" + Uri.EscapeDataString(bin) + "-"
                + Uri.EscapeDataString((accountNo ?? string.Empty).Trim())
                + "-compact2.png?amount=" + ((long)Math.Round(amount)).ToString("0", CultureInfo.InvariantCulture)
                + "&addInfo=" + Uri.EscapeDataString(Clean(content, "KTXNAPAS"))
                + "&accountName=" + Uri.EscapeDataString(accountName ?? string.Empty);
        }

        private static string Tlv(string id, string value)
        {
            var text = (value ?? string.Empty).Trim();
            return id + text.Length.ToString("D2", CultureInfo.InvariantCulture) + text;
        }

        private static string Clean(string? value, string fallback)
        {
            var cleaned = (value ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(cleaned)) return fallback;
            var ascii = new StringBuilder(cleaned.Length);
            foreach (var c in cleaned)
            {
                ascii.Append(c <= 127 ? c : '?');
            }
            return ascii.ToString().Replace("?", string.Empty).Trim();
        }

        /// <summary>CRC16-CCITT (0xFFFF, poly 0x1021) theo chuẩn EMV.</summary>
        public static string ComputeCrc16(string input)
        {
            var bytes = Encoding.UTF8.GetBytes(input);
            int crc = 0xFFFF;
            foreach (var b in bytes)
            {
                crc ^= b << 8;
                for (int i = 0; i < 8; i++)
                {
                    crc = (crc & 0x8000) != 0
                        ? ((crc << 1) ^ 0x1021) & 0xFFFF
                        : (crc << 1) & 0xFFFF;
                }
            }
            return crc.ToString("X4", CultureInfo.InvariantCulture);
        }
    }
}
