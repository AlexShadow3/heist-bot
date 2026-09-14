const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const items = require('../../items');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Consulte ton casier, ton argent et tes équipements.'),
    async execute(interaction) {
        const player = db.getPlayer(interaction.user.id);
        const jailed = db.isJailed(player);
        const minutesLeft = jailed ? Math.ceil((player.jailedUntil - Date.now()) / 60000) : 0;

        const userInventory = db.getUserInventory(interaction.user.id);
        const inventoryText = userInventory.length > 0
            ? userInventory.map(i => `• ${items[i.itemId]?.name || i.itemId} (x${i.quantity})`).join('\n')
            : 'Aucun objet';

        const embed = new EmbedBuilder()
            .setTitle(`Profil de ${interaction.user.username}`)
            .setColor(jailed ? 0xED4245 : 0x57F287)
            .addFields(
                { name: 'Portefeuille (Liquide)', value: `💰 **${player.cash} $** *(exposé au vol)*`, inline: true },
                { name: 'Planque (Blanchi)', value: `🔒 **${player.stash} $** *(sécurisé)*`, inline: true },
                { name: 'Statut', value: jailed ? `🚨 En cellule (${minutesLeft} min)` : '🟢 En liberté', inline: true },
                { name: 'Équipements', value: inventoryText, inline: false },
            )
            .setThumbnail(interaction.user.displayAvatarURL());

        await interaction.reply({ embeds: [embed] });
    },
};