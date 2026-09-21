const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Récupère des fonds de ta planque vers ton portefeuille liquide.')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Montant à retirer')
        .setRequired(true)
        .setMinValue(1)),
  async execute(interaction) {
    const player = db.getPlayer(interaction.user.id);
    if (!db.getHideout(interaction.user.id)) {
      return interaction.reply({
        content: '❌ Tu n\'as pas de planque à gérer. Utilise `/buy-hideout`.',
        ephemeral: true,
      });
    }

    if (db.isJailed(player)) {
      return interaction.reply({
        content: '🚨 Les gardiens surveillent tout, impossible de récupérer des fonds en cellule.',
        ephemeral: true,
      });
    }

    const amount = interaction.options.getInteger('amount');

    if (player.stash < amount) {
      return interaction.reply({
        content: `❌ Tu n'as que **${player.stash} $** dans ta planque sécurisée.`,
        ephemeral: true,
      });
    }

    db.withdrawFromStash(interaction.user.id, amount);

    const embed = new EmbedBuilder()
      .setTitle('📦 Retrait de la planque')
      .setColor(0x57F287)
      .setDescription(`Tu as récupéré **${amount} $** de ta planque secrète. Fais attention, cet argent est de nouveau exposé aux pickpockets (\`/rob\`) !`);

    await interaction.reply({ embeds: [embed] });
  },
};