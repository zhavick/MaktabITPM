using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace ProjectManagement.Api.Hubs
{
    public class SyncHub : Hub
    {
        public async Task BroadcastUpdate(string eventType, object data)
        {
            await Clients.All.SendAsync("ReceiveSyncEvent", new
            {
                Type = eventType,
                Data = data,
                Timestamp = DateTime.UtcNow
            });
        }

        public override async Task OnConnectedAsync()
        {
            await Clients.Caller.SendAsync("ConnectedConfirmation", new
            {
                ConnectionId = Context.ConnectionId,
                Message = "Terhubung ke Automatic Background Sync Hub.",
                Timestamp = DateTime.UtcNow
            });
            await base.OnConnectedAsync();
        }
    }
}
