const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const items = require('../../items');
const i18n = require('../../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Purchase equipment from the black market.')
        .setDescriptionLocalizations({
            'fr': 'Achète un équipement au marché noir.',
            'en-US': 'Purchase equipment from the black market.',
            'en-GB': 'Purchase equipment from the black market.',
        })
        .addStringOption(option => {
            option.setName('item')
                .setDescription('L\'objet à acheter / Item to buy')
                .setRequired(true);
            for (const key in items) {
                option.addChoices({ name: `${items[key].name} (${items[key].price} $)`, value: items[key].id });
            }
            return option;
        }),
    async execute(interaction) {
        const itemId = interaction.options.getString('item');
        const targetItem = i18n.getItem(itemId, interaction.guildId);

        if (!targetItem) {
            return interaction.reply({ content: i18n.t(interaction.guildId, 'buy.itemNotFound'), ephemeral: true });
        }

        const player = db.getPlayer(interaction.user.id);
        if (db.isJailed(player)) {
            return interaction.reply({ content: i18n.t(interaction.guildId, 'buy.jailed'), ephemeral: true });
        }

        if (player.cash < targetItem.price) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'buy.notEnoughCash', {
                    cash: i18n.formatNumber(player.cash, interaction.guildId),
                    missing: i18n.formatNumber(targetItem.price - player.cash, interaction.guildId),
                }),
                ephemeral: true,
            });
        }

        db.buyItem(interaction.user.id, targetItem.id, targetItem.price);

        await interaction.reply({
            content: i18n.t(interaction.guildId, 'buy.success', {
                item: targetItem.name,
                price: i18n.formatNumber(targetItem.price, interaction.guildId),
            }),
        });
    },
};