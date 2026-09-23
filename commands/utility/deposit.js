const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const i18n = require('../../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Launder your cash to secure it in your hideout (fee: 10%).')
        .setDescriptionLocalizations({
            'fr': 'Blanchis ton argent liquide pour le sécuriser dans ta planque (frais : 10 %).',
            'en-US': 'Launder your cash to secure it in your hideout (fee: 10%).',
            'en-GB': 'Launder your cash to secure it in your hideout (fee: 10%).',
        })
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Montant de liquide à déposer / Amount to deposit')
                .setRequired(true)
                .setMinValue(10)),
    async execute(interaction) {
        const player = db.getPlayer(interaction.user.id);
        const hideout = db.getHideout(interaction.user.id);

        if (!hideout) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'deposit.noHideout'),
                ephemeral: true,
            });
        }

        if (db.isJailed(player)) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'deposit.jailed'),
                ephemeral: true,
            });
        }

        const amount = interaction.options.getInteger('amount');

        if (player.cash < amount) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'deposit.notEnoughCash', {
                    cash: i18n.formatNumber(player.cash, interaction.guildId),
                }),
                ephemeral: true,
            });
        }

        const level = db.getHideoutLevel(hideout.level);
        const fee = Math.floor(amount * 0.10);
        const netAmount = amount - fee;
        if (player.stash + netAmount > level.capacity) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'deposit.exceedCapacity', {
                    capacity: i18n.formatNumber(level.capacity, interaction.guildId),
                }),
                ephemeral: true,
            });
        }

        db.depositToStash(interaction.user.id, amount);

        const embed = new EmbedBuilder()
            .setTitle(i18n.t(interaction.guildId, 'deposit.title'))
            .setColor(0x5865F2)
            .setDescription(i18n.t(interaction.guildId, 'deposit.description'))
            .addFields(
                { name: i18n.t(interaction.guildId, 'deposit.fieldDirty'), value: `${i18n.formatNumber(amount, interaction.guildId)} $`, inline: true },
                { name: i18n.t(interaction.guildId, 'deposit.fieldFee'), value: `-${i18n.formatNumber(fee, interaction.guildId)} $`, inline: true },
                { name: i18n.t(interaction.guildId, 'deposit.fieldClean'), value: `🔒 **${i18n.formatNumber(netAmount, interaction.guildId)} $**`, inline: true },
            );

        await interaction.reply({ embeds: [embed] });
    },
};