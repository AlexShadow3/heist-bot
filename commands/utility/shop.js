const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const items = require('../../items');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Consulte le catalogue du marché noir.'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🕶️ Marché Noir — Équipements')
            .setDescription('Procure-toi du matériel pour augmenter tes chances ou débloquer des braquages.')
            .setColor(0x2B2D31);

        for (const key in items) {
            const itm = items[key];
            embed.addFields({
                name: `${itm.name} — 💰 ${itm.price} $`,
                value: `*ID : \`${itm.id}\`*\n${itm.description}`,
                inline: false,
            });
        }

        embed.setFooter({ text: 'Utilise /buy <id> pour acquérir un objet.' });

        await interaction.reply({ embeds: [embed] });
    },
};