const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Consulte ton casier et ton argent.'),
    async execute(interaction) {
        const player = db.getPlayer(interaction.user.id);
        const jailed = db.isJailed(player);
        const minutesLeft = jailed ? Math.ceil((player.jailedUntil - Date.now()) / 60000) : 0;

        const embed = new EmbedBuilder()
            .setTitle(`Profil de criminel — ${interaction.user.username}`)
            .setColor(jailed ? 0xED4245 : 0x57F287)
            .addFields(
                { name: 'Cash', value: `💰 ${player.cash} $`, inline: true },
                { name: 'Statut', value: jailed ? `🚨 En cellule (${minutesLeft} min restante(s))` : '🟢 En liberté', inline: true },
            )
            .setThumbnail(interaction.user.displayAvatarURL());

        await interaction.reply({ embeds: [embed] });
    },
};