const { commands } = require('./commands');
require('./commands/balance');
require('./commands/setbalance');
require('./commands/canvas');
require('./commands/coinflip');
require('./commands/daily');
require('./commands/help');
require('./commands/sample');
require('./commands/avatar');
require('./commands/pay');
require('./commands/casino2start');
require('./commands/casino2swap');
require('./commands/leaderboard');

const { createClient } = require('./utils/client');
const { TOKEN, PREFIX, CHANNEL } = require('./utils/env');

const client = createClient();

global.ongoing_games = {};

// Event handler for when a message is received
client.on('messageCreate', (message) => {

	// Ignore messages from bots
	if (message.author.bot) return;

	// Ignore messages outside of the designated channel
	if (message.channel.id != CHANNEL) return;

	// Only act on commands starting with the prefix
	if (!message.content.startsWith(PREFIX)) return;

	const cmd = message.content.substring(PREFIX.length).toLowerCase().split(' ');
	commands.forEach((item) => {
		if (item.aliases.includes(cmd[0])) {
			item.func(message, cmd[1], cmd[2], cmd[3])
		}
	})
});

// Log in the bot using the token
client.login(TOKEN);