const { Events } = require('discord.js');
const db = require('../database');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`Bot connecté en tant que ${client.user.tag}`);
        db.processWeeklySettlements();
        setInterval(() => db.processWeeklySettlements(), 60 * 60 * 1000);
    },
};