const { Client, GatewayIntentBits, ActivityType } = require("discord.js");

let client;
function createClient() {
    // Get all the necessary intents from Discord
    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers,
        ]
    });
    
    // Event handler for when the bot is ready
    client.on('ready', () => {
        // Set bot's status to streaming, this is purely cosmetic
        client.user.setActivity({
            name: "on Warze.org",
            type: ActivityType.Streaming,
            url: "https://twitch.tv/warzedev",
        })
    
        console.log(`Logged in as ${client.user.tag}.`);
    });

    return client;
}
exports.createClient = createClient;

function getCache(userid) {
    return client.users.cache.get(userid);
}
exports.getCache = getCache;