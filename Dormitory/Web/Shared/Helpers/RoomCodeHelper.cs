namespace Dormitory.Web.Shared.Helpers
{
    public static class RoomCodeHelper
    {
        public static string FormatRoom(string building, string roomNumber)
        {
            if (string.IsNullOrWhiteSpace(roomNumber)) return building;
            string cleanRoom = roomNumber.Replace("P.", "", StringComparison.OrdinalIgnoreCase).Trim();
            if (!string.IsNullOrWhiteSpace(building) &&
                cleanRoom.StartsWith(building + "_", StringComparison.OrdinalIgnoreCase) ||
                cleanRoom.StartsWith(building + "-", StringComparison.OrdinalIgnoreCase))
            {
                cleanRoom = cleanRoom[(building.Length + 1)..];
            }
            return $"{building}-{cleanRoom}";
        }

        public static (string Building, string RoomNumber) ParseRoom(string formatted)
        {
            if (string.IsNullOrWhiteSpace(formatted)) return (string.Empty, string.Empty);
            int idx = formatted.LastIndexOfAny(['-', '_']);
            if (idx > 0 && idx < formatted.Length - 1)
            {
                return (formatted[..idx], formatted[(idx + 1)..]);
            }
            return (formatted, string.Empty);
        }
    }
}

