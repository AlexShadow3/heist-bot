const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('escape')
        .setDescription('Tente de t\'évader de ta cellule de prison.'),
    async execute(interaction) {
        const player = db.getPlayer(interaction.user.id);

        if (!db.isJailed(player)) {
            return interaction.reply({
                content: 'Tu n\'es pas en prison, inutile de t\'évader !',
                ephemeral: true,
            });
        }

        const roll = Math.random();
        const successRate = 0.35; // 35% de chance

        if (roll <= successRate) {
            db.releasePlayer(interaction.user.id);

            const winEmbed = new EmbedBuilder()
                .setTitle('Évasion réussie !')
                .setDescription(`🏃‍♂️💨 ${interaction.user} a profité d'un moment d'inattention des gardes pour franchir les grillages ! Tu es de nouveau libre.`)
                .setColor(0x57F287);

            await interaction.reply({ embeds: [winEmbed] });
        } else {
            const extraMinutes = 3;
            db.increaseJailTime(interaction.user.id, extraMinutes);
            const updatedPlayer = db.getPlayer(interaction.user.id);
            const remaining = Math.ceil((updatedPlayer.jailedUntil - Date.now()) / 60000);

            const failEmbed = new EmbedBuilder()
                .setTitle('🚨 Évasion manquée !')
                .setDescription(`Les projecteurs t'ont repéré dans la cour ! Un garde t'a intercepté.\n\nSanction : **+${extraMinutes} minutes** de peine ajoutée(s). Il te reste désormais **${remaining} minute(s)** en cellule.`)
                .setColor(0xED4245);

            await interaction.reply({ embeds: [failEmbed] });
        }
    },
};