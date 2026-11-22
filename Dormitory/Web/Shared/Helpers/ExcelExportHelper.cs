using ClosedXML.Excel;

namespace Dormitory.Web.Shared.Helpers
{
    public static class ExcelExportHelper
    {
        public const string ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        /// <summary>
        /// Tạo phần quốc hiệu & cơ quan chủ quản đối xứng 2 bên trái - phải,
        /// kèm tiêu đề chính cỡ 16 căn giữa và dòng mô tả phụ cỡ 13 (Times New Roman).
        /// Trả về dòng tiếp theo để bắt đầu bảng dữ liệu.
        /// </summary>
        public static int AddSymmetricalBanner(IXLWorksheet ws, string title, string subtitle, int totalCols)
        {
            int cols = Math.Max(totalCols, 4);
            int leftCols = cols / 2;
            int rightStart = leftCols + 1;

            // Dòng 1: Quốc hiệu & Cơ quan chủ quản đối xứng 2 bên
            var leftRow1 = ws.Range(1, 1, 1, leftCols).Merge();
            leftRow1.Value = "TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI";
            leftRow1.Style.Font.FontName = "Times New Roman";
            leftRow1.Style.Font.FontSize = 13;
            leftRow1.Style.Font.FontColor = XLColor.FromHtml("#334155");
            leftRow1.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            leftRow1.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

            var rightRow1 = ws.Range(1, rightStart, 1, cols).Merge();
            rightRow1.Value = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM";
            rightRow1.Style.Font.FontName = "Times New Roman";
            rightRow1.Style.Font.FontSize = 13;
            rightRow1.Style.Font.Bold = true;
            rightRow1.Style.Font.FontColor = XLColor.FromHtml("#0F172A");
            rightRow1.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            rightRow1.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Row(1).Height = 24;

            // Dòng 2: Đơn vị & Tiêu ngữ đối xứng 2 bên
            var leftRow2 = ws.Range(2, 1, 2, leftCols).Merge();
            leftRow2.Value = "PHÂN HIỆU TẠI TP. HỒ CHÍ MINH - KÝ TÚC XÁ";
            leftRow2.Style.Font.FontName = "Times New Roman";
            leftRow2.Style.Font.FontSize = 13;
            leftRow2.Style.Font.Bold = true;
            leftRow2.Style.Font.Underline = XLFontUnderlineValues.Single;
            leftRow2.Style.Font.FontColor = XLColor.FromHtml("#0B2A5B");
            leftRow2.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            leftRow2.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

            var rightRow2 = ws.Range(2, rightStart, 2, cols).Merge();
            rightRow2.Value = "Độc lập - Tự do - Hạnh phúc";
            rightRow2.Style.Font.FontName = "Times New Roman";
            rightRow2.Style.Font.FontSize = 13;
            rightRow2.Style.Font.Bold = true;
            rightRow2.Style.Font.Underline = XLFontUnderlineValues.Single;
            rightRow2.Style.Font.FontColor = XLColor.FromHtml("#0F172A");
            rightRow2.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            rightRow2.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Row(2).Height = 24;

            ws.Row(3).Height = 10;

            // Dòng 4: Tiêu đề chính (Times New Roman, cỡ 16, in đậm, căn giữa, nền xanh dịu hài hòa)
            var titleRange = ws.Range(4, 1, 4, totalCols).Merge();
            titleRange.Value = title;
            titleRange.Style.Font.FontName = "Times New Roman";
            titleRange.Style.Font.FontSize = 16;
            titleRange.Style.Font.Bold = true;
            titleRange.Style.Font.FontColor = XLColor.FromHtml("#0B2A5B");
            titleRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#F1F5F9");
            titleRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            titleRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            titleRange.Style.Border.TopBorder = XLBorderStyleValues.Medium;
            titleRange.Style.Border.TopBorderColor = XLColor.FromHtml("#0B2A5B");
            ws.Row(4).Height = 36;

            // Dòng 5: Thông tin phụ (Times New Roman, cỡ 13, in nghiêng, căn giữa)
            var subRange = ws.Range(5, 1, 5, totalCols).Merge();
            subRange.Value = subtitle;
            subRange.Style.Font.FontName = "Times New Roman";
            subRange.Style.Font.FontSize = 13;
            subRange.Style.Font.Italic = true;
            subRange.Style.Font.FontColor = XLColor.FromHtml("#334155");
            subRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
            subRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            subRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            subRange.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
            subRange.Style.Border.BottomBorderColor = XLColor.FromHtml("#CBD5E1");
            ws.Row(5).Height = 26;

            ws.Row(6).Height = 10;
            return 7;
        }

        /// <summary>
        /// Tạo phần chữ ký đối xứng 2 bên trái - phải ở cuối bảng.
        /// </summary>
        public static void AddSymmetricalFooter(IXLWorksheet ws, int startRow, int totalCols)
        {
            int cols = Math.Max(totalCols, 4);
            int leftCols = cols / 2;
            int rightStart = leftCols + 1;
            int row = startRow + 1;

            var dateRange = ws.Range(row, rightStart, row, cols).Merge();
            dateRange.Value = $"TP. Hồ Chí Minh, ngày {DateTime.Now:dd} tháng {DateTime.Now:MM} năm {DateTime.Now:yyyy}";
            dateRange.Style.Font.FontName = "Times New Roman";
            dateRange.Style.Font.FontSize = 13;
            dateRange.Style.Font.Italic = true;
            dateRange.Style.Font.FontColor = XLColor.FromHtml("#334155");
            dateRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            dateRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Row(row).Height = 24;

            row++;
            var leftSign = ws.Range(row, 1, row, leftCols).Merge();
            leftSign.Value = "NGƯỜI LẬP BIỂU";
            leftSign.Style.Font.FontName = "Times New Roman";
            leftSign.Style.Font.FontSize = 13;
            leftSign.Style.Font.Bold = true;
            leftSign.Style.Font.FontColor = XLColor.FromHtml("#0F172A");
            leftSign.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            leftSign.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

            var rightSign = ws.Range(row, rightStart, row, cols).Merge();
            rightSign.Value = "TM. BAN QUẢN LÝ KÝ TÚC XÁ";
            rightSign.Style.Font.FontName = "Times New Roman";
            rightSign.Style.Font.FontSize = 13;
            rightSign.Style.Font.Bold = true;
            rightSign.Style.Font.FontColor = XLColor.FromHtml("#0F172A");
            rightSign.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            rightSign.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Row(row).Height = 24;
        }

        /// <summary>
        /// Tạo file Excel chuẩn UTC2: Times New Roman 13, tiêu đề chính 16, bố cục đối xứng 2 bên,
        /// màu sắc hài hòa và tự động căn đều độ rộng cột + trang in ngang.
        /// </summary>
        public static byte[] BuildStyledTableWorkbook(
            string sheetName,
            string title,
            string subtitle,
            string[] headers,
            IEnumerable<object?[]> rows,
            XLAlignmentHorizontalValues[]? columnAlignments = null)
        {
            using var workbook = new XLWorkbook();
            workbook.Style.Font.FontName = "Times New Roman";
            workbook.Style.Font.FontSize = 13;
            workbook.Style.Font.FontColor = XLColor.FromHtml("#1E293B");

            string safeSheet = string.IsNullOrWhiteSpace(sheetName) ? "BaoCao" : sheetName.Trim();
            if (safeSheet.Length > 31) safeSheet = safeSheet[..31];

            var ws = workbook.Worksheets.Add(safeSheet);
            int totalCols = headers.Length;

            int headerRow = AddSymmetricalBanner(ws, title, subtitle, totalCols);

            // Dòng Header bảng
            for (int col = 1; col <= totalCols; col++)
            {
                var cell = ws.Cell(headerRow, col);
                cell.Value = headers[col - 1];
                cell.Style.Font.FontName = "Times New Roman";
                cell.Style.Font.FontSize = 13;
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#0B2A5B");
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                cell.Style.Alignment.WrapText = true;
                cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                cell.Style.Border.OutsideBorderColor = XLColor.FromHtml("#1E40AF");
            }
            ws.Row(headerRow).Height = 32;

            int rowIndex = headerRow + 1;
            int dataCount = 0;
            foreach (var rowValues in rows)
            {
                bool isAlternate = dataCount % 2 == 1;
                for (int col = 1; col <= totalCols; col++)
                {
                    var cell = ws.Cell(rowIndex, col);
                    var val = col - 1 < rowValues.Length ? rowValues[col - 1] : string.Empty;
                    cell.Value = val switch
                    {
                        int i => i,
                        long l => l,
                        decimal d => d,
                        double dbl => dbl,
                        _ => SanitizeFormulaPrefix(val?.ToString() ?? string.Empty)
                    };
                    cell.Style.Font.FontName = "Times New Roman";
                    cell.Style.Font.FontSize = 13;
                    cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                    cell.Style.Alignment.Horizontal = (columnAlignments != null && col - 1 < columnAlignments.Length)
                        ? columnAlignments[col - 1]
                        : XLAlignmentHorizontalValues.Left;
                    cell.Style.Alignment.WrapText = true;
                    if (isAlternate)
                    {
                        cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
                    }
                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    cell.Style.Border.OutsideBorderColor = XLColor.FromHtml("#CBD5E1");
                }
                ws.Row(rowIndex).Height = 26;
                rowIndex++;
                dataCount++;
            }

            if (dataCount == 0)
            {
                var emptyRange = ws.Range(rowIndex, 1, rowIndex, totalCols).Merge();
                emptyRange.Value = "Không có dữ liệu phù hợp.";
                emptyRange.Style.Font.FontName = "Times New Roman";
                emptyRange.Style.Font.FontSize = 13;
                emptyRange.Style.Font.Italic = true;
                emptyRange.Style.Font.FontColor = XLColor.FromHtml("#64748B");
                emptyRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                emptyRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                emptyRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                emptyRange.Style.Border.OutsideBorderColor = XLColor.FromHtml("#CBD5E1");
                ws.Row(rowIndex).Height = 28;
                rowIndex++;
            }

            AddSymmetricalFooter(ws, rowIndex, totalCols);

            ws.SheetView.FreezeRows(headerRow);
            ws.Columns(1, totalCols).AdjustToContents();
            for (int col = 1; col <= totalCols; col++)
            {
                var column = ws.Column(col);
                column.Width = Math.Clamp(column.Width + 5.0, 14.0, 44.0);
            }
            ws.PageSetup.PageOrientation = XLPageOrientation.Landscape;
            ws.PageSetup.CenterHorizontally = true;
            ws.PageSetup.FitToPages(1, 0);

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        public static string SanitizeFormulaPrefix(string value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            char first = value[0];
            return first is '=' or '+' or '-' or '@' ? "'" + value : value;
        }
    }
}
