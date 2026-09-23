const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Consulte le catalogue du marché noir.')
        .setDescriptionLocalizations({
            'fr': 'Consulte le catalogue du marché noir.',
            'en-US': 'Browse the black market catalog.',
            'en-GB': 'Browse the black market catalog.',
        }),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle(i18n.t(interaction.guildId, 'shop.title'))
            .setDescription(i18n.t(interaction.guildId, 'shop.description'))
            .setColor(0x2B2D31);

        const items = i18n.getAllItems(interaction.guildId);

        for (const key in items) {
            const itm = items[key];
            embed.addFields({
                name: `${itm.name} — 💰 ${i18n.formatNumber(itm.price, interaction.guildId)} $`,
                value: `*ID : \`${itm.id}\`*\n${itm.description}`,
                inline: false,
            });
        }

        embed.setFooter({ text: i18n.t(interaction.guildId, 'shop.footer') });

        await interaction.reply({ embeds: [embed] });
    },
};