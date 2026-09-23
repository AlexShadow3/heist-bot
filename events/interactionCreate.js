const { Events } = require('discord.js');
const i18n = require('../i18n');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        // --- VÉRIFICATION DU CANAL ---
        // La commande administrative /language peut être exécutée dans n'importe quel salon
        if (interaction.commandName !== 'language' && interaction.channel && interaction.channel.name !== 'heist-bot') {
            let channelMention = '`#heist-bot`';

            // Si on est sur un serveur, on essaie de trouver le canal pour le mentionner cliquable
            if (interaction.guild) {
                const targetChannel = interaction.guild.channels.cache.find(c => c.name === 'heist-bot');
                if (targetChannel) channelMention = `<#${targetChannel.id}>`;
            }

            // Réponse éphémère (visible que par l'utilisateur) pour lui indiquer le bon canal
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'common.channelOnly', { channel: channelMention }),
                ephemeral: true,
            });
        }
        // -----------------------------

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            const replyOptions = {
                content: i18n.t(interaction.guildId, 'common.genericError'),
                ephemeral: true,
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(replyOptions);
            } else {
                await interaction.reply(replyOptions);
            }
        }
    },
};