using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using ClosedXML.Excel;

namespace Dormitory.Web.Shared.Helpers;

/// <summary>
/// Hỗ trợ đọc và chuẩn hóa cột dữ liệu Excel dùng chung cho nhập hồ sơ sinh viên và hợp đồng.
/// </summary>
public static class ExcelImportHelper
{
    public static Dictionary<string, int> BuildColumnMap(IXLRangeRow headerRow)
    {
        var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        int firstCol = headerRow.RangeAddress.FirstAddress.ColumnNumber;

        foreach (var cell in headerRow.CellsUsed())
        {
            string norm = NormalizeHeaderKey(cell.GetString());
            if (string.IsNullOrEmpty(norm)) continue;

            string? canonical = norm switch
            {
                "ma don" or "ma don dang ky" or "madondangky" or "applicationcode" => "appCode",
                "mssv" or "ma sinh vien" or "masinhvien" or "ma sv" => "mssv",
                "ho va ten" or "ho ten" or "hovaten" or "hoten" or "sinh vien" => "hoTen",
                "ngay sinh" or "ngaysinh" => "ngaySinh",
                "gioi tinh" or "gioitinh" => "gioiTinh",
                "cccd" or "cmnd" or "cccd/cmnd" => "cccd",
                "dien thoai" or "so dien thoai" or "dienthoai" or "sdt" => "dienThoai",
                "email" => "email",
                "dia chi thuong tru" or "dia chi" or "diachi" or "que quan" => "diaChi",
                "lop" or "ma lop" or "malop" => "maLop",
                "nam nhap hoc" or "namnhaphoc" => "namNhapHoc",
                "dien uu tien" or "doi tuong uu tien" or "doituonguutien" or "uu tien" => "doiTuongUuTien",
                "ma phong" or "maphong" or "phong" => "roomCode",
                "ma giuong" or "magiuong" or "giuong" or "bedid" => "bedId",
                "gia thue thang" or "gia thue" or "giathuethang" or "tien phong" or "monthlyfee" => "monthlyFee",
                "tien coc" or "tiencoc" or "coc" or "depositamount" => "depositAmount",
                "ngay bat dau" or "ngaybatdau" or "startdate" => "startDate",
                "ngay ket thuc" or "ngayketthuc" or "enddate" => "endDate",
                "trang thai don" or "trangthaidon" or "trang thai" or "status" => "appStatus",
                _ => null
            };

            if (canonical != null)
            {
                map.TryAdd(canonical, cell.Address.ColumnNumber - firstCol + 1);
            }
        }

        return map;
    }

    public static string NormalizeHeaderKey(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        string decomposed = raw.Trim().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);
        foreach (char ch in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark) continue;
            sb.Append(ch switch
            {
                'đ' => 'd',
                'Đ' => 'd',
                _ => char.ToLowerInvariant(ch)
            });
        }
        return Regex.Replace(sb.ToString(), @"\s+", " ").Trim();
    }

    public static string ReadCellText(IXLRangeRow row, IReadOnlyDictionary<string, int> cols, string key)
    {
        return cols.TryGetValue(key, out int colIdx)
            ? row.Cell(colIdx).GetString().Trim()
            : string.Empty;
    }

    public static bool IsIgnoredApplicationStatus(string statusText)
    {
        if (string.IsNullOrWhiteSpace(statusText)) return false;
        string norm = NormalizeHeaderKey(statusText);
        return norm is "bi tu choi" or "tu choi" or "tuchoi" or "het han" or "hethan" or "da huy" or "dahuy";
    }

    public static bool TryReadDate(
        IXLRangeRow row,
        IReadOnlyDictionary<string, int> cols,
        string key,
        DateTime? defaultValue,
        out DateTime date)
    {
        if (!cols.TryGetValue(key, out int colIdx))
        {
            if (defaultValue.HasValue)
            {
                date = defaultValue.Value;
                return true;
            }
            date = default;
            return false;
        }

        var cell = row.Cell(colIdx);
        if (cell.IsEmpty() || string.IsNullOrWhiteSpace(cell.GetString()))
        {
            if (defaultValue.HasValue)
            {
                date = defaultValue.Value;
                return true;
            }
            date = default;
            return false;
        }

        if ((cell.DataType == XLDataType.DateTime || cell.TryGetValue<DateTime>(out _)) &&
            cell.TryGetValue<DateTime>(out var dt))
        {
            date = dt.Date;
            return true;
        }

        string text = cell.GetString().Trim();
        string[] formats = ["yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "d-M-yyyy", "MM/dd/yyyy"];
        if (DateTime.TryParseExact(text, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var exact))
        {
            date = exact.Date;
            return true;
        }

        if (DateTime.TryParse(text, new CultureInfo("vi-VN"), DateTimeStyles.None, out var viDate))
        {
            date = viDate.Date;
            return true;
        }

        date = default;
        return false;
    }

    public static bool TryReadDecimal(
        IXLRangeRow row,
        IReadOnlyDictionary<string, int> cols,
        string key,
        out decimal? value)
    {
        if (!cols.TryGetValue(key, out int colIdx))
        {
            value = null;
            return true;
        }

        var cell = row.Cell(colIdx);
        if (cell.IsEmpty() || string.IsNullOrWhiteSpace(cell.GetString()))
        {
            value = null;
            return true;
        }

        if (cell.DataType == XLDataType.Number && cell.TryGetValue<double>(out var num))
        {
            value = Convert.ToDecimal(num);
            return true;
        }

        string text = cell.GetString().Trim()
            .Replace("đ", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Replace("VND", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Replace(" ", string.Empty);

        if (Regex.IsMatch(text, @"^\d{1,3}(\.\d{3})+$"))
        {
            text = text.Replace(".", string.Empty);
        }
        else if (Regex.IsMatch(text, @"^\d{1,3}(,\d{3})+$"))
        {
            text = text.Replace(",", string.Empty);
        }

        if (decimal.TryParse(text, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed))
        {
            value = parsed;
            return true;
        }

        value = null;
        return false;
    }
}
