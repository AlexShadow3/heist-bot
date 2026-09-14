const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const items = require('../../items');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Achète un équipement au marché noir.')
        .addStringOption(option => {
            option.setName('item')
                .setDescription('L\'objet à acheter')
                .setRequired(true);
            for (const key in items) {
                option.addChoices({ name: `${items[key].name} (${items[key].price} $)`, value: items[key].id });
            }
            return option;
        }),
    async execute(interaction) {
        const itemId = interaction.options.getString('item');
        const targetItem = items[itemId];

        if (!targetItem) {
            return interaction.reply({ content: 'Objet introuvable.', ephemeral: true });
        }

        const player = db.getPlayer(interaction.user.id);
        if (db.isJailed(player)) {
            return interaction.reply({ content: '🚨 Tu ne peux rien acheter depuis ta cellule.', ephemeral: true });
        }

        if (player.cash < targetItem.price) {
            return interaction.reply({
                content: `❌ Fonds insuffisants ! Tu as **${player.cash} $**, il te manque **${targetItem.price - player.cash} $**.`,
                ephemeral: true,
            });
        }

        db.buyItem(interaction.user.id, targetItem.id, targetItem.price);

        await interaction.reply({
            content: `✅ Tu as acheté **${targetItem.name}** pour **${targetItem.price} $** !`,
        });
    },
};