const Database = require('better-sqlite3');
const path = require('node:path');

const db = new Database(path.join(__dirname, 'data.db'));

const HIDEOUT_LEVELS = [
  { level: 1, price: 5000, capacity: 50000, rent: 500 },
  { level: 2, price: 12000, capacity: 120000, rent: 1200 },
  { level: 3, price: 25000, capacity: 250000, rent: 2500 },
  { level: 4, price: 50000, capacity: 500000, rent: 5000 },
  { level: 5, price: 100000, capacity: 1000000, rent: 10000 },
  { level: 6, price: 150000, capacity: 1500000, rent: 15000 },
  { level: 7, price: 200000, capacity: 2000000, rent: 20000 },
  { level: 8, price: 300000, capacity: 3000000, rent: 30000 },
  { level: 9, price: 400000, capacity: 4000000, rent: 40000 },
  { level: 10, price: 500000, capacity: 5000000, rent: 50000 },
];

function getLatestMondayUtc(now = Date.now()) {
  const date = new Date(now);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

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
  CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS hideouts (
    userId TEXT PRIMARY KEY,
    level INTEGER NOT NULL DEFAULT 1,
    cameras INTEGER NOT NULL DEFAULT 0,
    guards INTEGER NOT NULL DEFAULT 0,
    lastWeeklyProcessed INTEGER NOT NULL DEFAULT 0
  )
`).run();

if (!db.prepare("SELECT value FROM schema_meta WHERE key = 'stash_migrated'").get()) {
  db.transaction(() => {
    db.prepare('UPDATE players SET cash = cash + MAX(stash, 0), stash = 0 WHERE stash > 0').run();
    db.prepare("INSERT INTO schema_meta (key, value) VALUES ('stash_migrated', '1')").run();
  })();
}

const vaultTableInfo = db.prepare("PRAGMA table_info(police_vault)").all();
const hasGuildId = vaultTableInfo.some(col => col.name === 'guildId');

if (vaultTableInfo.length > 0 && !hasGuildId) {
  const oldRow = db.prepare("SELECT amount FROM police_vault WHERE id = 1").get();
  const migratedAmount = oldRow ? oldRow.amount : 0;

  db.prepare("DROP TABLE police_vault").run();
  db.prepare(`
    CREATE TABLE police_vault (
      guildId TEXT PRIMARY KEY,
      amount INTEGER DEFAULT 0
    )
  `).run();

  db.prepare(`
    INSERT INTO police_vault (guildId, amount)
    VALUES (?, ?)
  `).run('1469430262789312635', migratedAmount);
} else if (vaultTableInfo.length === 0) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS police_vault (
      guildId TEXT PRIMARY KEY,
      amount INTEGER DEFAULT 0
    )
  `).run();
}

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

// Nouvelle table pour les cooldowns spécifiques aux cibles de braquages
db.prepare(`
  CREATE TABLE IF NOT EXISTS heist_cooldowns (
    userId TEXT,
    targetId TEXT,
    availableAt INTEGER,
    PRIMARY KEY (userId, targetId)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS lawyer_services (
    userId TEXT PRIMARY KEY,
    expiresAt INTEGER DEFAULT 0
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guildId TEXT PRIMARY KEY,
    language TEXT DEFAULT 'fr'
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
    if (!Number.isInteger(amount) || amount < 0) throw new Error('Montant invalide');
    db.prepare('UPDATE players SET cash = cash + ? WHERE userId = ?').run(amount, userId);
  },

  debitCash(userId, amount) {
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('Montant invalide');
    const result = db.prepare('UPDATE players SET cash = cash - ? WHERE userId = ? AND cash >= ?')
      .run(amount, userId, amount);
    if (result.changes !== 1) throw new Error('Fonds insuffisants');
  },

  depositToStash(userId, grossAmount, taxRate = 0.10) {
    const player = this.getPlayer(userId);
    const hideout = this.getHideout(userId);
    if (!hideout) throw new Error('Aucune planque');
    if (!Number.isInteger(grossAmount) || grossAmount <= 0 || player.cash < grossAmount) {
      throw new Error('Fonds insuffisants');
    }
    const fee = Math.floor(grossAmount * taxRate);
    const netAmount = grossAmount - fee;
    const level = HIDEOUT_LEVELS[hideout.level - 1];
    if (player.stash + netAmount > level.capacity) throw new Error('Capacité de planque dépassée');
    const transaction = db.transaction(() => {
      const result = db.prepare('UPDATE players SET cash = cash - ?, stash = stash + ? WHERE userId = ? AND cash >= ? AND stash + ? <= ?')
        .run(grossAmount, netAmount, userId, grossAmount, netAmount, level.capacity);
      if (result.changes !== 1) throw new Error('Solde ou capacité insuffisante');
    });
    transaction();
    return { fee, netAmount };
  },

  withdrawFromStash(userId, amount) {
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('Montant invalide');
    const transaction = db.transaction(() => {
      const result = db.prepare('UPDATE players SET stash = stash - ?, cash = cash + ? WHERE userId = ? AND stash >= ?')
        .run(amount, amount, userId, amount);
      if (result.changes !== 1) throw new Error('Solde de planque insuffisant');
    });
    transaction();
  },

  seizeFine(guildId, userId, targetFine) {
    const player = this.getPlayer(userId);
    let remainingToSeize = targetFine;
    let takenFromStash = 0;
    let takenFromCash = 0;

    if (player.stash > 0) {
      takenFromStash = Math.min(player.stash, remainingToSeize);
      remainingToSeize -= takenFromStash;
    }

    if (remainingToSeize > 0 && player.cash > 0) {
      takenFromCash = Math.min(player.cash, remainingToSeize);
      remainingToSeize -= takenFromCash;
    }

    const totalSeized = takenFromStash + takenFromCash;

    if (totalSeized > 0 && guildId) {
      const transaction = db.transaction(() => {
        if (takenFromStash > 0) {
          db.prepare('UPDATE players SET stash = stash - ? WHERE userId = ?').run(takenFromStash, userId);
        }
        if (takenFromCash > 0) {
          db.prepare('UPDATE players SET cash = cash - ? WHERE userId = ?').run(takenFromCash, userId);
        }
        db.prepare(`
          INSERT INTO police_vault (guildId, amount)
          VALUES (?, ?)
          ON CONFLICT(guildId) DO UPDATE SET amount = amount + ?
        `).run(guildId, totalSeized, totalSeized);
      });
      transaction();
    }

    return { totalSeized, takenFromStash, takenFromCash };
  },

  getHideout(userId) {
    return db.prepare('SELECT * FROM hideouts WHERE userId = ?').get(userId) || null;
  },

  getHideoutLevel(level) {
    return HIDEOUT_LEVELS[level - 1] || null;
  },

  buyHideout(userId) {
    const level = HIDEOUT_LEVELS[0];
    const transaction = db.transaction(() => {
      const result = db.prepare(`
        UPDATE players SET cash = cash - ?
        WHERE userId = ? AND cash >= ?
      `).run(level.price, userId, level.price);
      if (result.changes !== 1) throw new Error('Fonds insuffisants');
      if (this.getHideout(userId)) throw new Error('Une planque existe déjà');
      db.prepare('INSERT INTO hideouts (userId, level, lastWeeklyProcessed) VALUES (?, 1, ?)')
        .run(userId, 1, getLatestMondayUtc());
    });
    transaction();
  },

  upgradeHideout(userId) {
    const hideout = this.getHideout(userId);
    if (!hideout) throw new Error('Aucune planque');
    if (hideout.level >= HIDEOUT_LEVELS.length) throw new Error('Niveau maximum atteint');
    const next = HIDEOUT_LEVELS[hideout.level];
    const transaction = db.transaction(() => {
      const result = db.prepare('UPDATE players SET cash = cash - ? WHERE userId = ? AND cash >= ?')
        .run(next.price, userId, next.price);
      if (result.changes !== 1) throw new Error('Fonds insuffisants');
      db.prepare('UPDATE hideouts SET level = level + 1 WHERE userId = ? AND level = ?')
        .run(userId, hideout.level);
    });
    transaction();
  },

  buyHideoutCamera(userId) {
    return this.buyHideoutProtection(userId, 'cameras', 25000, 3);
  },

  buyHideoutGuard(userId) {
    return this.buyHideoutProtection(userId, 'guards', 40000, 3);
  },

  buyHideoutProtection(userId, column, price, max) {
    const hideout = this.getHideout(userId);
    if (!hideout) throw new Error('Aucune planque');
    if (hideout[column] >= max) throw new Error('Maximum atteint');
    const transaction = db.transaction(() => {
      const result = db.prepare('UPDATE players SET cash = cash - ? WHERE userId = ? AND cash >= ?')
        .run(price, userId, price);
      if (result.changes !== 1) throw new Error('Fonds insuffisants');
      db.prepare(`UPDATE hideouts SET ${column} =${column} + 1 WHERE userId = ? AND ${column} < ?`)
        .run(userId, max);
    });
    transaction();
  },

  consumeHideoutGuard(userId) {
    const result = db.prepare('UPDATE hideouts SET guards = guards - 1 WHERE userId = ? AND guards > 0').run(userId);
    return result.changes === 1;
  },

  getHideoutProtection(userId) {
    const hideout = this.getHideout(userId);
    return hideout ? { cameras: hideout.cameras, guards: hideout.guards } : { cameras: 0, guards: 0 };
  },

  processWeeklySettlements(now = Date.now()) {
    const latestMonday = getLatestMondayUtc(now);
    const rows = db.prepare('SELECT * FROM hideouts WHERE lastWeeklyProcessed < ?').all(latestMonday);
    for (const hideout of rows) {
      db.transaction(() => {
        let cursor = hideout.lastWeeklyProcessed > 0 ? hideout.lastWeeklyProcessed : latestMonday;
        while (cursor < latestMonday) {
          const nextMonday = cursor + 7 * 24 * 60 * 60 * 1000;
          const level = HIDEOUT_LEVELS[hideout.level - 1];
          const player = db.prepare('SELECT cash, stash FROM players WHERE userId = ?').get(hideout.userId);
          const paid = Math.min(player.cash, level.rent);
          db.prepare('UPDATE players SET cash = cash - ? WHERE userId = ?').run(paid, hideout.userId);
          if (paid === level.rent && hideout.level >= 6) {
            const rate = 1 + (hideout.level - 6) * 0.25;
            const income = Math.floor(level.capacity * rate / 100);
            db.prepare('UPDATE players SET stash = MIN(?, stash + ?) WHERE userId = ?')
              .run(level.capacity, income, hideout.userId);
          }
          cursor = nextMonday;
        }
        db.prepare('UPDATE hideouts SET lastWeeklyProcessed = ? WHERE userId = ?')
          .run(latestMonday, hideout.userId);
      })();
    }
    return rows.length;
  },

  getPoliceVault(guildId) {
    if (!guildId) return 0;
    const row = db.prepare('SELECT amount FROM police_vault WHERE guildId = ?').get(guildId);
    return row ? row.amount : 0;
  },

  takeFromPoliceVault(guildId, amount) {
    if (!guildId) return;
    db.prepare(`
      INSERT INTO police_vault (guildId, amount)
      VALUES (?, 0)
      ON CONFLICT(guildId) DO UPDATE SET amount = MAX(0, amount - ?)
    `).run(guildId, amount);
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
      const result = db.prepare('UPDATE players SET cash = cash - ? WHERE userId = ? AND cash >= ?')
        .run(price, userId, price);
      if (result.changes !== 1) throw new Error('Fonds insuffisants');

      if (itemId === 'lawyer') {
        const row = db.prepare('SELECT expiresAt FROM lawyer_services WHERE userId = ?').get(userId);
        const currentExp = row && row.expiresAt > Date.now() ? row.expiresAt : Date.now();
        const newExp = currentExp + 60 * 60 * 1000;
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
      const result = db.prepare('UPDATE players SET cash = cash - ? WHERE userId = ? AND cash >= ?')
        .run(amount, fromUserId, amount);
      if (result.changes !== 1) throw new Error('Fonds insuffisants');
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

  // Nouvelles fonctions pour les cooldowns de braquages
  getHeistCooldown(userId, targetId) {
    const row = db.prepare('SELECT availableAt FROM heist_cooldowns WHERE userId = ? AND targetId = ?').get(userId, targetId);
    return row ? row.availableAt : 0;
  },

  setHeistCooldown(userId, targetId, minutes) {
    const until = Date.now() + minutes * 60 * 1000;
    db.prepare(`
      INSERT INTO heist_cooldowns (userId, targetId, availableAt)
      VALUES (?, ?, ?)
      ON CONFLICT(userId, targetId) DO UPDATE SET availableAt = ?
    `).run(userId, targetId, until, until);
  },

  recordHeistAttempt(userId, success = false) {
    if (success) {
      db.prepare('UPDATE players SET heistsTotal = heistsTotal + 1, heistsWon = heistsWon + 1 WHERE userId = ?').run(userId);
    } else {
      db.prepare('UPDATE players SET heistsTotal = heistsTotal + 1 WHERE userId = ?').run(userId);
    }
  },

  getAllPlayers() {
    return db.prepare(`
      SELECT userId, cash, stash, (cash + stash) AS netWorth, heistsTotal, heistsWon
      FROM players
      ORDER BY netWorth DESC
    `).all();
  },

  getGuildLanguage(guildId) {
    if (!guildId) return 'fr';
    const row = db.prepare('SELECT language FROM guild_settings WHERE guildId = ?').get(guildId);
    return row && row.language ? row.language : 'fr';
  },

  setGuildLanguage(guildId, language) {
    if (!guildId) return;
    const normalizedLang = (language === 'en') ? 'en' : 'fr';
    db.prepare(`
      INSERT INTO guild_settings (guildId, language)
      VALUES (?, ?)
      ON CONFLICT(guildId) DO UPDATE SET language = ?
    `).run(guildId, normalizedLang, normalizedLang);
  },
};