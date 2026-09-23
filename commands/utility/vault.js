const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const i18n = require('../../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vault')
        .setDescription('Check the seized jackpot stored in this server\'s Law Enforcement Vault.')
        .setDescriptionLocalizations({
            'fr': 'Consulte la cagnotte saisie stockée dans le Coffre des forces de l\'ordre de ce serveur.',
            'en-US': 'Check the seized jackpot stored in this server\'s Law Enforcement Vault.',
            'en-GB': 'Check the seized jackpot stored in this server\'s Law Enforcement Vault.',
        }),
    async execute(interaction) {
        if (!interaction.guildId) {
            return interaction.reply({
                content: i18n.t('en', 'common.guildOnly'),
                ephemeral: true,
            });
        }

        const vaultAmount = db.getPoliceVault(interaction.guildId);
        const formattedAmount = i18n.formatNumber(vaultAmount, interaction.guildId);

        const embed = new EmbedBuilder()
            .setTitle(i18n.t(interaction.guildId, 'vault.title', { guild: interaction.guild.name }))
            .setDescription(i18n.t(interaction.guildId, 'vault.description', { amount: formattedAmount }))
            .setColor(0x3498DB)
            .setFooter({ text: i18n.t(interaction.guildId, 'vault.footer') })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};