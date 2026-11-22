using System.Globalization;

namespace Dormitory.Web.Shared.Helpers
{
    public static class NameHelper
    {
        public static string GetInitials(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return "SV";
            var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 1) return StringInfo.GetNextTextElement(parts[0]).ToUpper();
            return (StringInfo.GetNextTextElement(parts[0]) + StringInfo.GetNextTextElement(parts[^1])).ToUpper();
        }

        public static string ToTitleCase(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;
            return CultureInfo.CurrentCulture.TextInfo.ToTitleCase(input.ToLower());
        }
    }
}

