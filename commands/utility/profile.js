const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const items = require('../../items');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Consulte ton casier, ton argent, tes statistiques et tes équipements.'),
    async execute(interaction) {
        const player = db.getPlayer(interaction.user.id);
        const jailed = db.isJailed(player);
        const minutesLeft = jailed ? Math.ceil((player.jailedUntil - Date.now()) / 60000) : 0;

        const userInventory = db.getUserInventory(interaction.user.id);
        const inventoryLines = userInventory.map(i => `• ${items[i.itemId]?.name || i.itemId} (x${i.quantity})`);

        const lawyerExp = db.getLawyerExpiresAt(interaction.user.id);
        if (lawyerExp > Date.now()) {
            const minLawyer = Math.ceil((lawyerExp - Date.now()) / 60000);
            inventoryLines.push(`• ⚖️ Avocat véreux (actif : encore ${minLawyer} min)`);
        }

        const inventoryText = inventoryLines.length > 0 ? inventoryLines.join('\n') : 'Aucun équipement';

        const total = player.heistsTotal || 0;
        const won = player.heistsWon || 0;
        const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

        const embed = new EmbedBuilder()
            .setTitle(`Profil de ${interaction.user.username}`)
            .setColor(jailed ? 0xED4245 : 0x57F287)
            .addFields(
                { name: 'Portefeuille (Liquide)', value: `💰 **${player.cash.toLocaleString('fr-FR')} $** *(exposé)*`, inline: true },
                { name: 'Planque (Blanchi)', value: `🔒 **${player.stash.toLocaleString('fr-FR')} $** *(sécurisé)*`, inline: true },
                { name: 'Statut', value: jailed ? `🚨 En cellule (${minutesLeft} min)` : '🟢 En liberté', inline: true },
                { name: 'Braquages', value: `🎯 **${won}/${total}** réussis (${winRate} %)`, inline: false },
                { name: 'Équipements & Services', value: inventoryText, inline: false },
            )
            .setThumbnail(interaction.user.displayAvatarURL());

        await interaction.reply({ embeds: [embed] });
    },
};