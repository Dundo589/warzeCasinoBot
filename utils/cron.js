const settings = require('../settings.json');
const { changeChests } = require('./chests');
const { changeBalance } = require('./currency');
const { db } = require('./db');
const { lottery } = require('./lottery');
const { market_item_names } = require('./market');
const { randRange } = require('./random');
const { Luckpool } = require('./luckpool');

function checkIfTimerReady(client, table, time, rewardName) {
    // Go through hourlies or dailies to see if users can redeem them
    db.all(`SELECT * FROM ${table}`, [], (err, results) => {
        if (err) {
            console.log(err.message);
            return;
        }

        results.forEach((user) => {
            const seconds_left = user.last + time - Date.now() / 1000

            if (seconds_left < 0 && seconds_left > -60) {

                // Look if the user wants to get notified
                db.get('SELECT notify FROM rewardnotify WHERE id = ?', [user.id], (err, row) => {
                    if (err) {
                        console.log(err.message);
                        return;
                    }

                    // User has never touched that setting before
                    if (!row) {
                        return;
                    }
                    
                    // If they want to be notified
                    if (row.notify == 1) {
                        // Ping them!
                        const channel = client.channels.cache.get(settings.channel)
                        channel.send(`<@${user.id}>, your ${rewardName} is ready!`);
                    }
                })
            }
        })
    })
}

function updateMarketplace(client) {
    db.all(`SELECT * FROM marketplace`, [], (err, rows) => {
        if (err) {
            console.log(err.message);
            return;
        }

        // Go through all marketplace items to see if they ended
        rows.forEach((row) => {
            if (row.startedat + 3600 < Date.now() / 1000) {
                const channel = client.channels.cache.get(settings.channel)
                if (row.highestbidder != null) {
                    // Someone gets the items
                    changeChests(row.highestbidder, row.itemamount, row.type.replace('chest',''))

                    // Seller gets the highest bid
                    if (row.seller != 'Weize') {
                        changeBalance(row.seller, row.bidamount);
                    }
                    channel.send(`<@${row.highestbidder}>, you won the auction and received **${row.itemamount}x** ${market_item_names[row.type]}!`);
                } else {
                    if (row.seller != 'Weize') {
                        // Give the seller the items back
                        changeChests(row.seller, row.itemamount, row.type.replace('chest',''))
                        channel.send(`<@${row.seller}>, nobody bid for you. You got your **${row.itemamount}x** ${market_item_names[row.type]} back.`)
                    }
                }
                // Remove item from marketplace
                db.run('DELETE FROM marketplace WHERE id = ?', [row.id], (err) => {
                    if (err) {
                        console.log(err.message);
                        return;
                    }
                });
            }
        })

        // If there are too few offers, Weize has a chance to put something into the marketplace
        if (rows.length < 5 && Math.random() > 0.8) {
            // Place new item into the marketplace
            const itemid = (Math.round(Math.random() * 50000)).toString(16);
            const now = Math.floor(Date.now() / 1000);

            // Chances of what chests Weize will put up
            const lp = new Luckpool()
            lp.add(40, {item: 'redchest', amount: randRange(1, 7), price: randRange(65, 140)})
            lp.add(40, {item: 'bluechest', amount: randRange(1, 3), price: randRange(85, 400)})
            lp.add(20, {item: 'goldenchest', amount: 1, price: randRange(600, 1000)})
            const pick = lp.get();
            
            // Insert into the marketplace database
            db.run(`INSERT INTO marketplace (id, seller, type, bidamount, highestbidder, startedat, itemamount) VALUES (?, ?, ?, ?, ?, ?, ?)`, [itemid, 'Weize', pick.item, pick.price * pick.amount, null, now, pick.amount])
        }
    })
}

function everyMinute(client) {
    checkIfTimerReady(client, 'hourlies', 3600, 'hourly');
    checkIfTimerReady(client, 'dailies', 86400, 'daily');
    lottery.drawwinner();
    updateMarketplace(client);
}
exports.everyMinute = everyMinute;