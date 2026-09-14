const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

function getCrimeTitle(netWorth) {
    if (netWorth >= 50000) return '👑 Parrain de la mafia';
    if (netWorth >= 15000) return '💼 Baron du crime';
    if (netWorth >= 5000) return '🕶️ Braqueur aguerri';
    if (netWorth >= 1000) return '🧢 Voleur à la tire';
    return '🐣 Petite frappe';
}

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Affiche le Top 10 des criminels les plus riches du syndicat.'),
    async execute(interaction) {
        await interaction.deferReply();

        const topPlayers = db.getTopPlayers(10);

        if (topPlayers.length === 0) {
            return interaction.editReply('Aucun criminel enregistré pour le moment.');
        }

        const leaderboardLines = await Promise.all(
            topPlayers.map(async (p, index) => {
                const position = index < 3 ? MEDALS[index] : `**#${index + 1}**`;
                const title = getCrimeTitle(p.netWorth);

                let username = 'Inconnu';
                try {
                    const user = await interaction.client.users.fetch(p.userId);
                    username = user.username;
                } catch {
                    username = `Criminel (${p.userId.slice(0, 5)}...)`;
                }

                const total = p.heistsTotal || 0;
                const won = p.heistsWon || 0;
                const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

                return `${position} **${username}** — **${p.netWorth.toLocaleString('fr-FR')} $**\n> *${title}* (💵 ${p.cash.toLocaleString('fr-FR')} $ | 🔒 ${p.stash.toLocaleString('fr-FR')} $)\n> 🎯 Braquages : **${won}/${total}** réussis (${winRate} %)`;
            })
        );

        const embed = new EmbedBuilder()
            .setTitle('🏆 Panthéon du Syndicat du Crime')
            .setDescription(leaderboardLines.join('\n\n'))
            .setColor(0xF1C40F)
            .setFooter({ text: 'Fortune totale = Cash liquide + Planque sécurisée' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};