const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const i18n = require('../../i18n');

function getCrimeTitle(netWorth, guildId) {
    if (netWorth >= 50000) return i18n.t(guildId, 'leaderboard.titles.godfather');
    if (netWorth >= 15000) return i18n.t(guildId, 'leaderboard.titles.baron');
    if (netWorth >= 5000) return i18n.t(guildId, 'leaderboard.titles.heister');
    if (netWorth >= 1000) return i18n.t(guildId, 'leaderboard.titles.pickpocket');
    return i18n.t(guildId, 'leaderboard.titles.thug');
}

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Displays the Top 10 richest criminals on this server.')
        .setDescriptionLocalizations({
            'fr': 'Affiche le Top 10 des criminels les plus riches de ce serveur.',
            'en-US': 'Displays the Top 10 richest criminals on this server.',
            'en-GB': 'Displays the Top 10 richest criminals on this server.',
        }),
    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: i18n.t('en', 'common.guildOnly'), ephemeral: true });
        }

        await interaction.deferReply();

        const allPlayers = db.getAllPlayers();
        const topPlayers = [];

        for (const player of allPlayers) {
            if (topPlayers.length >= 10) break;

            try {
                const member = await interaction.guild.members.fetch(player.userId);
                if (member) {
                    topPlayers.push({ ...player, displayName: member.displayName });
                }
            } catch {
                // Ignore player not on server
            }
        }

        if (topPlayers.length === 0) {
            return interaction.editReply(i18n.t(interaction.guildId, 'leaderboard.empty'));
        }

        const leaderboardLines = topPlayers.map((p, index) => {
            const position = index < 3 ? MEDALS[index] : `**#${index + 1}**`;
            const title = getCrimeTitle(p.netWorth, interaction.guildId);

            const total = p.heistsTotal || 0;
            const won = p.heistsWon || 0;
            const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

            return i18n.t(interaction.guildId, 'leaderboard.line', {
                position,
                name: p.displayName,
                netWorth: i18n.formatNumber(p.netWorth, interaction.guildId),
                title,
                cash: i18n.formatNumber(p.cash, interaction.guildId),
                stash: i18n.formatNumber(p.stash, interaction.guildId),
                won,
                total,
                winRate,
            });
        });

        const embed = new EmbedBuilder()
            .setTitle(i18n.t(interaction.guildId, 'leaderboard.title', { guild: interaction.guild.name }))
            .setDescription(leaderboardLines.join('\n\n'))
            .setColor(0xF1C40F)
            .setFooter({ text: i18n.t(interaction.guildId, 'leaderboard.footer') })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};