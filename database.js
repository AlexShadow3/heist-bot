const Database = require('better-sqlite3');
const path = require('node:path');

const db = new Database(path.join(__dirname, 'data.db'));

// Initialisation de la table des joueurs
db.prepare(`
  CREATE TABLE IF NOT EXISTS players (
    userId TEXT PRIMARY KEY,
    cash INTEGER DEFAULT 500,
    jailedUntil INTEGER DEFAULT 0
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
};