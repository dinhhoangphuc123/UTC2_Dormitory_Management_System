namespace Dormitory.Web.Shared.Helpers
{
    public static class RoomCodeHelper
    {
        public static string FormatRoom(string building, string roomNumber)
        {
            if (string.IsNullOrWhiteSpace(roomNumber)) return building;
            string cleanRoom = roomNumber.Replace("P.", "").Trim();
            return $"{building}-{cleanRoom}";
        }

        public static (string Building, string RoomNumber) ParseRoom(string formatted)
        {
            if (string.IsNullOrWhiteSpace(formatted)) return (string.Empty, string.Empty);
            var parts = formatted.Split('-', '_');
            if (parts.Length >= 2)
            {
                return (parts[0], parts[1]);
            }
            return (formatted, string.Empty);
        }
    }
}

