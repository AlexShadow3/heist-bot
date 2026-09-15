const Database = require('better-sqlite3');
const path = require('node:path');

const db = new Database(path.join(__dirname, 'data.db'));

// Initialisation des tables
db.prepare(`
  CREATE TABLE IF NOT EXISTS players (
    userId TEXT PRIMARY KEY,
    cash INTEGER DEFAULT 500,
    stash INTEGER DEFAULT 0,
    jailedUntil INTEGER DEFAULT 0,
    heistsTotal INTEGER DEFAULT 0,
    heistsWon INTEGER DEFAULT 0
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

db.prepare(`
  CREATE TABLE IF NOT EXISTS rob_cooldowns (
    userId TEXT PRIMARY KEY,
    availableAt INTEGER DEFAULT 0
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS escape_cooldowns (
    userId TEXT PRIMARY KEY,
    availableAt INTEGER DEFAULT 0
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS lawyer_services (
    userId TEXT PRIMARY KEY,
    expiresAt INTEGER DEFAULT 0
  )
`).run();

module.exports = {
  getPlayer(userId) {
    let player = db.prepare('SELECT * FROM players WHERE userId = ?').get(userId);
    if (!player) {
      db.prepare('INSERT INTO players (userId, cash, stash, jailedUntil) VALUES (?, 500, 0, 0)').run(userId);
      player = { userId, cash: 500, stash: 0, jailedUntil: 0 };
    }
    return player;
  },

  addCash(userId, amount) {
    db.prepare('UPDATE players SET cash = cash + ? WHERE userId = ?').run(amount, userId);
  },

  depositToStash(userId, grossAmount, taxRate = 0.10) {
    const fee = Math.floor(grossAmount * taxRate);
    const netAmount = grossAmount - fee;
    const transaction = db.transaction(() => {
      db.prepare('UPDATE players SET cash = cash - ? WHERE userId = ?').run(grossAmount, userId);
      db.prepare('UPDATE players SET stash = stash + ? WHERE userId = ?').run(netAmount, userId);
    });
    transaction();
    return { fee, netAmount };
  },

  withdrawFromStash(userId, amount) {
    const transaction = db.transaction(() => {
      db.prepare('UPDATE players SET stash = stash - ? WHERE userId = ?').run(amount, userId);
      db.prepare('UPDATE players SET cash = cash + ? WHERE userId = ?').run(amount, userId);
    });
    transaction();
  },

  jailPlayer(userId, minutes) {
    const until = Date.now() + minutes * 60 * 1000;
    db.prepare('UPDATE players SET jailedUntil = ? WHERE userId = ?').run(until, userId);
  },

  releasePlayer(userId) {
    db.prepare('UPDATE players SET jailedUntil = 0 WHERE userId = ?').run(userId);
  },

  increaseJailTime(userId, extraMinutes) {
    const player = this.getPlayer(userId);
    const base = player.jailedUntil > Date.now() ? player.jailedUntil : Date.now();
    const newUntil = base + extraMinutes * 60 * 1000;
    db.prepare('UPDATE players SET jailedUntil = ? WHERE userId = ?').run(newUntil, userId);
  },

  isJailed(player) {
    return player.jailedUntil > Date.now();
  },

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

      if (itemId === 'lawyer') {
        const row = db.prepare('SELECT expiresAt FROM lawyer_services WHERE userId = ?').get(userId);
        const currentExp = row && row.expiresAt > Date.now() ? row.expiresAt : Date.now();
        const newExp = currentExp + 60 * 60 * 1000; // +1 heure
        db.prepare(`
          INSERT INTO lawyer_services (userId, expiresAt)
          VALUES (?, ?)
          ON CONFLICT(userId) DO UPDATE SET expiresAt = ?
        `).run(userId, newExp, newExp);
      } else {
        db.prepare(`
          INSERT INTO inventory (userId, itemId, quantity)
          VALUES (?, ?, 1)
          ON CONFLICT(userId, itemId) DO UPDATE SET quantity = quantity + 1
        `).run(userId, itemId);
      }
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

  hasActiveLawyer(userId) {
    const row = db.prepare('SELECT expiresAt FROM lawyer_services WHERE userId = ?').get(userId);
    return row && row.expiresAt > Date.now();
  },

  getLawyerExpiresAt(userId) {
    const row = db.prepare('SELECT expiresAt FROM lawyer_services WHERE userId = ?').get(userId);
    return row ? row.expiresAt : 0;
  },

  transferCash(fromUserId, toUserId, amount) {
    const transaction = db.transaction(() => {
      db.prepare('UPDATE players SET cash = cash - ? WHERE userId = ?').run(amount, fromUserId);
      db.prepare('UPDATE players SET cash = cash + ? WHERE userId = ?').run(amount, toUserId);
    });
    transaction();
  },

  getRobCooldown(userId) {
    const row = db.prepare('SELECT availableAt FROM rob_cooldowns WHERE userId = ?').get(userId);
    return row ? row.availableAt : 0;
  },

  setRobCooldown(userId, minutes) {
    const until = Date.now() + minutes * 60 * 1000;
    db.prepare(`
      INSERT INTO rob_cooldowns (userId, availableAt)
      VALUES (?, ?)
      ON CONFLICT(userId) DO UPDATE SET availableAt = ?
    `).run(userId, until, until);
  },

  getEscapeCooldown(userId) {
    const row = db.prepare('SELECT availableAt FROM escape_cooldowns WHERE userId = ?').get(userId);
    return row ? row.availableAt : 0;
  },

  setEscapeCooldown(userId, minutes) {
    const until = Date.now() + minutes * 60 * 1000;
    db.prepare(`
      INSERT INTO escape_cooldowns (userId, availableAt)
      VALUES (?, ?)
      ON CONFLICT(userId) DO UPDATE SET availableAt = ?
    `).run(userId, until, until);
  },

  recordHeistAttempt(userId, success = false) {
    if (success) {
      db.prepare('UPDATE players SET heistsTotal = heistsTotal + 1, heistsWon = heistsWon + 1 WHERE userId = ?').run(userId);
    } else {
      db.prepare('UPDATE players SET heistsTotal = heistsTotal + 1 WHERE userId = ?').run(userId);
    }
  },

  getTopPlayers(limit = 10) {
    return db.prepare(`
    SELECT userId, cash, stash, (cash + stash) AS netWorth, heistsTotal, heistsWon
    FROM players
    ORDER BY netWorth DESC
    LIMIT ?
  `).all(limit);
  },

  getAllPlayers() {
    return db.prepare(`
      SELECT userId, cash, stash, (cash + stash) AS netWorth, heistsTotal, heistsWon
      FROM players
      ORDER BY netWorth DESC
    `).all();
  },
};