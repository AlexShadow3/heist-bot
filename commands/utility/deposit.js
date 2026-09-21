const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Blanchis ton argent liquide pour le sécuriser dans ta planque (frais : 10 %).')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Montant de liquide à déposer')
                .setRequired(true)
                .setMinValue(10)),
    async execute(interaction) {
        const player = db.getPlayer(interaction.user.id);
        const hideout = db.getHideout(interaction.user.id);

        if (!hideout) {
            return interaction.reply({
                content: '❌ Tu dois d\'abord acheter une planque avec `/buy-hideout`.',
                ephemeral: true,
            });
        }

        if (db.isJailed(player)) {
            return interaction.reply({
                content: '🚨 Impossible de blanchir de l\'argent depuis ta cellule.',
                ephemeral: true,
            });
        }

        const amount = interaction.options.getInteger('amount');

        if (player.cash < amount) {
            return interaction.reply({
                content: `❌ Fonds insuffisants ! Tu n'as que **${player.cash} $** en liquide sur toi.`,
                ephemeral: true,
            });
        }

        const level = db.getHideoutLevel(hideout.level);
        const fee = Math.floor(amount * 0.10);
        const netAmount = amount - fee;
        if (player.stash + netAmount > level.capacity) {
            return interaction.reply({
                content: `❌ Ce dépôt dépasserait la capacité de ta planque (${level.capacity.toLocaleString('fr-FR')} $).`,
                ephemeral: true,
            });
        }

        db.depositToStash(interaction.user.id, amount);

        const embed = new EmbedBuilder()
            .setTitle('🧼 Blanchiment d\'argent terminé')
            .setColor(0x5865F2)
            .setDescription(`Opération discrète effectuée avec succès dans un commerce de façade.`)
            .addFields(
                { name: 'Montant sale déposé', value: `${amount} $`, inline: true },
                { name: 'Frais de blanchiment (10 %)', value: `-${fee} $`, inline: true },
                { name: 'Crédité dans la planque', value: `🔒 **${netAmount} $**`, inline: true },
            );

        await interaction.reply({ embeds: [embed] });
    },
};