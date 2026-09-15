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
        .setDescription('Affiche le Top 10 des criminels les plus riches de ce serveur.'),
    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: 'Cette commande doit être exécutée dans un serveur.', ephemeral: true });
        }

        await interaction.deferReply();

        // Récupération de tous les comptes enregistrés
        const allPlayers = db.getAllPlayers();

        // Filtrage sur les membres présents dans le serveur
        const serverMembers = await interaction.guild.members.fetch();
        const filteredPlayers = allPlayers.filter(p => serverMembers.has(p.userId));

        if (filteredPlayers.length === 0) {
            return interaction.editReply('Aucun criminel de ce serveur n\'est enregistré pour le moment.');
        }

        const topPlayers = filteredPlayers.slice(0, 10);

        const leaderboardLines = topPlayers.map((p, index) => {
            const position = index < 3 ? MEDALS[index] : `**#${index + 1}**`;
            const title = getCrimeTitle(p.netWorth);
            const member = serverMembers.get(p.userId);
            const username = member ? member.displayName : `Criminel (${p.userId.slice(0, 5)}...)`;

            const total = p.heistsTotal || 0;
            const won = p.heistsWon || 0;
            const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

            return `${position} **${username}** — **${p.netWorth.toLocaleString('fr-FR')} $**\n> *${title}* (💵 ${p.cash.toLocaleString('fr-FR')} $ | 🔒 ${p.stash.toLocaleString('fr-FR')} $)\n> 🎯 Braquages : **${won}/${total}** réussis (${winRate} %)`;
        });

        const embed = new EmbedBuilder()
            .setTitle(`🏆 Panthéon du Crime — ${interaction.guild.name}`)
            .setDescription(leaderboardLines.join('\n\n'))
            .setColor(0xF1C40F)
            .setFooter({ text: 'Classement local au serveur • Cash + Planque' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};