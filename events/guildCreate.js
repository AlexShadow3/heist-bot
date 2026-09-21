const { Events, ChannelType } = require('discord.js');

module.exports = {
    name: Events.GuildCreate,
    async execute(guild) {
        try {
            // Cherche si un canal 'heist-bot' existe déjà sur le serveur
            const existingChannel = guild.channels.cache.find(c => c.name === 'heist-bot');

            if (!existingChannel) {
                // Crée le canal s'il n'existe pas
                await guild.channels.create({
                    name: 'heist-bot',
                    type: ChannelType.GuildText,
                    topic: 'Canal dédié aux opérations du Syndicat (Syndicate Crime Bot).',
                    reason: 'Création automatique du canal dédié lors de l\'ajout du bot au serveur.'
                });
                console.log(`[INFO] Canal 'heist-bot' créé avec succès sur le serveur : ${guild.name}`);
            }
        } catch (error) {
            console.error(`[ERREUR] Impossible de créer le canal sur le serveur ${guild.name} :`, error);
        }
    },
};