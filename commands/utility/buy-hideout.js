const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const i18n = require('../../i18n');

const LEVEL_ONE = db.getHideoutLevel(1);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy-hideout')
        .setDescription('Achète ta première planque secrète.')
        .setDescriptionLocalizations({
            'fr': 'Achète ta première planque secrète.',
            'en-US': 'Purchase your first secret hideout.',
            'en-GB': 'Purchase your first secret hideout.',
        }),
    async execute(interaction) {
        const player = db.getPlayer(interaction.user.id);
        if (db.isJailed(player)) {
            return interaction.reply({ content: i18n.t(interaction.guildId, 'buyHideout.jailed'), ephemeral: true });
        }
        if (db.getHideout(interaction.user.id)) {
            return interaction.reply({ content: i18n.t(interaction.guildId, 'buyHideout.alreadyHave'), ephemeral: true });
        }
        if (player.cash < LEVEL_ONE.price) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'buyHideout.notEnoughCash', {
                    price: i18n.formatNumber(LEVEL_ONE.price, interaction.guildId),
                    cash: i18n.formatNumber(player.cash, interaction.guildId),
                }),
                ephemeral: true,
            });
        }

        db.buyHideout(interaction.user.id);
        const embed = new EmbedBuilder()
            .setTitle(i18n.t(interaction.guildId, 'buyHideout.title'))
            .setColor(0x57F287)
            .setDescription(i18n.t(interaction.guildId, 'buyHideout.description'))
            .addFields(
                { name: i18n.t(interaction.guildId, 'buyHideout.level'), value: '1', inline: true },
                { name: i18n.t(interaction.guildId, 'buyHideout.capacity'), value: `${i18n.formatNumber(LEVEL_ONE.capacity, interaction.guildId)} $`, inline: true },
                { name: i18n.t(interaction.guildId, 'buyHideout.rent'), value: `${i18n.formatNumber(LEVEL_ONE.rent, interaction.guildId)} $`, inline: true },
            );
        await interaction.reply({ embeds: [embed] });
    },
};
