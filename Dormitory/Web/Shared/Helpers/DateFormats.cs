namespace Dormitory.Web.Shared.Helpers
{
    public static class DateFormats
    {
        public const string StandardDate = "dd/MM/yyyy";
        public const string StandardDateTime = "dd/MM/yyyy HH:mm";
        public const string IsoDate = "yyyy-MM-dd";

        public static string FormatDate(DateTime? date) =>
            date?.ToString(StandardDate) ?? string.Empty;

        public static string FormatDateTime(DateTime? dateTime) =>
            dateTime?.ToString(StandardDateTime) ?? string.Empty;
    }
}

