const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

const LEVEL_ONE = db.getHideoutLevel(1);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy-hideout')
    .setDescription('Achète ta première planque secrète.'),
  async execute(interaction) {
    const player = db.getPlayer(interaction.user.id);
    if (db.isJailed(player)) {
      return interaction.reply({ content: '🚨 Tu ne peux pas acheter une planque depuis ta cellule.', ephemeral: true });
    }
    if (db.getHideout(interaction.user.id)) {
      return interaction.reply({ content: '❌ Tu possèdes déjà une planque. Gère-la avec `/hideout`.', ephemeral: true });
    }
    if (player.cash < LEVEL_ONE.price) {
      return interaction.reply({
        content: `❌ Il te faut **${LEVEL_ONE.price.toLocaleString('fr-FR')} $**. Tu n'as que **${player.cash.toLocaleString('fr-FR')} $**.`,
        ephemeral: true,
      });
    }

    db.buyHideout(interaction.user.id);
    const embed = new EmbedBuilder()
      .setTitle('🏚️ Nouvelle planque')
      .setColor(0x57F287)
      .setDescription('Ta planque est prête. Tu peux désormais blanchir et protéger ton argent.')
      .addFields(
        { name: 'Niveau', value: '1', inline: true },
        { name: 'Capacité', value: `${LEVEL_ONE.capacity.toLocaleString('fr-FR')} $`, inline: true },
        { name: 'Loyer hebdomadaire', value: `${LEVEL_ONE.rent.toLocaleString('fr-FR')} $`, inline: true },
      );
    await interaction.reply({ embeds: [embed] });
  },
};
