const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const i18n = require('../../i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Withdraw funds from your hideout to your cash wallet.')
    .setDescriptionLocalizations({
      'fr': 'Récupère des fonds de ta planque vers ton portefeuille liquide.',
      'en-US': 'Withdraw funds from your hideout to your cash wallet.',
      'en-GB': 'Withdraw funds from your hideout to your cash wallet.',
    })
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Montant à retirer / Amount to withdraw')
        .setRequired(true)
        .setMinValue(1)),
  async execute(interaction) {
    const player = db.getPlayer(interaction.user.id);
    if (!db.getHideout(interaction.user.id)) {
      return interaction.reply({
        content: i18n.t(interaction.guildId, 'withdraw.noHideout'),
        ephemeral: true,
      });
    }

    if (db.isJailed(player)) {
      return interaction.reply({
        content: i18n.t(interaction.guildId, 'withdraw.jailed'),
        ephemeral: true,
      });
    }

    const amount = interaction.options.getInteger('amount');

    if (player.stash < amount) {
      return interaction.reply({
        content: i18n.t(interaction.guildId, 'withdraw.notEnoughStash', {
          stash: i18n.formatNumber(player.stash, interaction.guildId),
        }),
        ephemeral: true,
      });
    }

    db.withdrawFromStash(interaction.user.id, amount);

    const embed = new EmbedBuilder()
      .setTitle(i18n.t(interaction.guildId, 'withdraw.title'))
      .setColor(0x57F287)
      .setDescription(i18n.t(interaction.guildId, 'withdraw.description', {
        amount: i18n.formatNumber(amount, interaction.guildId),
      }));

    await interaction.reply({ embeds: [embed] });
  },
};