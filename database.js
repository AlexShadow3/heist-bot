const Database = require('better-sqlite3');
const path = require('node:path');

const db = new Database(path.join(__dirname, 'data.db'));

// Initialisation des tables
db.prepare(`
  CREATE TABLE IF NOT EXISTS players (
    userId TEXT PRIMARY KEY,
    cash INTEGER DEFAULT 500,
    jailedUntil INTEGER DEFAULT 0
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS inventory (
    userId TEXT,
    itemId TEXT,
    quantity INTEGER DEFAULT 0,
    PRIMARY KEY (userId, itemId)
  )
`).run();

module.exports = {
    getPlayer(userId) {
        let player = db.prepare('SELECT * FROM players WHERE userId = ?').get(userId);
        if (!player) {
            db.prepare('INSERT INTO players (userId, cash, jailedUntil) VALUES (?, 500, 0)').run(userId);
            player = { userId, cash: 500, jailedUntil: 0 };
        }
        return player;
    },

    addCash(userId, amount) {
        db.prepare('UPDATE players SET cash = cash + ? WHERE userId = ?').run(amount, userId);
    },

    jailPlayer(userId, minutes) {
        const until = Date.now() + minutes * 60 * 1000;
        db.prepare('UPDATE players SET jailedUntil = ? WHERE userId = ?').run(until, userId);
    },

    isJailed(player) {
        return player.jailedUntil > Date.now();
    },

    // Gestion de l'inventaire
    getItemQuantity(userId, itemId) {
        const row = db.prepare('SELECT quantity FROM inventory WHERE userId = ? AND itemId = ?').get(userId, itemId);
        return row ? row.quantity : 0;
    },

    getUserInventory(userId) {
        return db.prepare('SELECT itemId, quantity FROM inventory WHERE userId = ? AND quantity > 0').all(userId);
    },

    buyItem(userId, itemId, price) {
        const transaction = db.transaction(() => {
            db.prepare('UPDATE players SET cash = cash - ? WHERE userId = ?').run(price, userId);
            db.prepare(`
        INSERT INTO inventory (userId, itemId, quantity)
        VALUES (?, ?, 1)
        ON CONFLICT(userId, itemId) DO UPDATE SET quantity = quantity + 1
      `).run(userId, itemId);
        });
        transaction();
    },

    consumeItem(userId, itemId) {
        const row = db.prepare('SELECT quantity FROM inventory WHERE userId = ? AND itemId = ?').get(userId, itemId);
        if (row && row.quantity > 0) {
            db.prepare('UPDATE inventory SET quantity = quantity - 1 WHERE userId = ? AND itemId = ?').run(userId, itemId);
            return true;
        }
        return false;
    },
};