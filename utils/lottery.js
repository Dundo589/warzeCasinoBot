const { loadImage, createCanvas } = require("canvas");
const { changeChests } = require("./chests");
const { changeBalance } = require("./currency");
const emojis = require('../emojis.json');
const { randChoice } = require("./random");
const { send, sendBoth } = require("./sender");
const { addToStat } = require("./stats");
const { secToReadable, pluralS } = require("./timestr");

class Lottery {
    constructor() {
        this.avatars = {};
        this.tickets = [];
        this.ongoing = false;
        this.ogmsg = false;
        this.prize = 0;
        this.duration = 180;
        this.startedAt = 0;
    }
    canvas(message) {
        // Size of the canvas stays about the same but size of indiv avatars gets smaller
        const width = Math.ceil(Math.sqrt(this.tickets.length));

        const px = Math.min(128, Math.floor(500 / width));

        const cvs = createCanvas(width * px, width * px);
        const ctx = cvs.getContext('2d');

        // Draw in a grid pattern
        let index = 0;
        for (let y = 0; y < width; y ++) {
            for (let x = 0; x < width; x ++) {
                const ticket = this.tickets[index]
                if (ticket) {
                    const img = this.avatars[ticket];
                    ctx.drawImage(img, x * px, y * px, px, px);
                }
                index ++;
            }   
        }

        sendBoth(message, `Total tickets: **${this.tickets.length}** ${emojis.ticket} Prize: **${this.prize}** ${emojis.diamond}`, cvs);
    }
    addtickets(message, userid, amount, duration) {
        // If there is no ongoing lottery, the first user must start by putting atleast 10 tickets in
        if (!this.ongoing) {
            if (amount < 10) {
                send(message, `You have to buy atleast **10 tickets** ${emojis.ticket} yourself to start the lottery.`)
                return;
            } else {
                this.ongoing = true;
                this.startedAt = Date.now() / 1000;
                this.ogmsg = message;
                this.duration = duration * 60;

                const min = this.duration / 60

                // Lotteries over 30 minutes long can have an additional reward
                let additional_message = '';
                if (min >= 30) {
                    additional_message = `At **3+** participants, the prize pool will include a **Golden Chest** ${emojis.goldenchest}`
                }

                send(message, `The Lottery buying phase has begun!
The winner will be drawn in **${min} minute${pluralS(min)}**.
Every new participant in the lottery adds **+100** ${emojis.diamond} to the pool.
${additional_message}`);
            }
        }

        // Buy n tickets as the userid
        for (let i = 0; i < amount; i ++) {
            this.tickets.push(userid)
        }

        // Add the amount to the prize
        this.prize += amount * 10;

        // Save the img
        loadImage(`https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.jpeg`).then((img) => {
            if (!this.avatars[message.author.id]) {
                this.avatars[message.author.id] = img;
                if (message.author.id !== this.ogmsg.author.id) {
                    this.prize += 100;
                }
            }

            // Show the tickets
            this.canvas(message);
        })
    }
    minuntilwinner() {
        const now = Date.now() / 1000;
        const minutes_left = Math.floor((this.startedAt + this.duration - now) / 60)
        return minutes_left
    }
    drawwinner() {
        if (!this.ongoing) return

        const minutes_left = this.minuntilwinner();
        if (minutes_left <= 0) {
            // Draw the winner
            const winner = randChoice(this.tickets);
            send(this.ogmsg, `<@${winner}> won the lottery! :tada: **+${this.prize}** ${emojis.diamond}`)
            changeBalance(winner, this.prize);

            // Track statistics
            addToStat('lotterywon', winner, 1).then(() => {
                addToStat('lotterydwon', winner, this.prize);
            });

            // Add a golden chest to the prize pool if duration was atleast 30 min and 3+ participants
            if (Object.keys(this.avatars).length >= 3 && this.duration >= 1800) {
                changeChests(winner, 1, 'golden');
                send(this.ogmsg, `<@${winner}> also received a **Golden Chest** ${emojis.goldenchest}`);
            }

            // Reset lottery
            this.tickets = [];
            this.avatars = {};
            this.prize = 0;

            // Stop the lottery
            this.ongoing = false;
        } else if (minutes_left <= 5 || minutes_left % 5 == 0) {
            send(this.ogmsg, `**${minutes_left} minute${pluralS(minutes_left)}** left before the winner is announced.`)
        }
    }
}

let lottery = new Lottery();
exports.lottery = lottery;