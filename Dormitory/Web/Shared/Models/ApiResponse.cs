namespace Dormitory.Web.Shared.Models
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; } = true;
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }

        public static ApiResponse<T> Ok(T data, string message = "Thành công") =>
            new() { Success = true, Message = message, Data = data };

        public static ApiResponse<T> Fail(string message) =>
            new() { Success = false, Message = message, Data = default };
    }

    public class ApiResponse
    {
        public bool Success { get; set; } = true;
        public string Message { get; set; } = string.Empty;

        public static ApiResponse Ok(string message = "Thành công") =>
            new() { Success = true, Message = message };

        public static ApiResponse Fail(string message) =>
            new() { Success = false, Message = message };
    }
}

