using Xunit;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace Dormitory.UnitTests.Features.StudentPortal
{
    public class StudentSupportViewsTests
    {
        private static readonly HttpClient _client = new HttpClient { BaseAddress = new System.Uri("http://localhost:5245") };

        private async Task<JObject> GetJsonAsync(string url)
        {
            var resp = await _client.GetAsync(url);
            resp.EnsureSuccessStatusCode();
            var txt = await resp.Content.ReadAsStringAsync();
            var json = JObject.Parse(txt);
            Assert.True((bool)json["success"], $"API {url} reported failure: {json[\"message\"]}");
            return (JObject)json["data"];
        }

        [Fact]
        public async Task Notifications_Returns_List_And_UnreadCount()
        {
            var data = await GetJsonAsync("/api/me/notifications?unreadOnly=false");
            Assert.True(data["notifications"].HasValues, "Should return notifications collection");
            var unread = await GetJsonAsync("/api/me/notifications/unread-count");
            Assert.True(unread["unreadCount"].Value<int>() >= 0);
        }

        [Fact]
        public async Task Violations_Returns_Empty_State_When_None()
        {
            var data = await GetJsonAsync("/api/me/violations");
            var list = data["violations"] as JArray;
            Assert.NotNull(list);
        }

        [Fact]
        public async Task SupportInfo_Returns_Expected_Sections()
        {
            var data = await GetJsonAsync("/api/me/support-info");
            Assert.True(data["rules"].HasValues, "Support info should contain rules");
            Assert.True(data["contact"].HasValues, "Support info should contain contact block");
        }
    }
}
