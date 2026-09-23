const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const db = require('../../database');
const i18n = require('../../i18n');

function renderHideout(userId, username, guildId) {
  const hideout = db.getHideout(userId);
  if (!hideout) return { content: i18n.t(guildId, 'hideout.noHideout'), embeds: [], components: [] };
  const level = db.getHideoutLevel(hideout.level);
  const next = db.getHideoutLevel(hideout.level + 1);

  const camerasDetail = `${hideout.cameras}/3 (−${hideout.cameras * 2} %)`;
  const guardsDetail = `${hideout.guards}/3 (−${hideout.guards * 5} %)`;

  const passiveIncomeText = hideout.level >= 6
    ? i18n.t(guildId, 'hideout.passiveIncomeDetail', { rate: i18n.formatNumber(1 + (hideout.level - 6) * 0.25, guildId) })
    : i18n.t(guildId, 'hideout.passiveIncomeUnavailable');

  const embed = new EmbedBuilder()
    .setTitle(i18n.t(guildId, 'hideout.title', { user: username }))
    .setColor(0x5865F2)
    .addFields(
      { name: i18n.t(guildId, 'hideout.level'), value: `${hideout.level}/10`, inline: true },
      { name: i18n.t(guildId, 'hideout.stash'), value: `${i18n.formatNumber(db.getPlayer(userId).stash, guildId)} / ${i18n.formatNumber(level.capacity, guildId)} $`, inline: true },
      { name: i18n.t(guildId, 'hideout.rent'), value: `${i18n.formatNumber(level.rent, guildId)} $`, inline: true },
      { name: i18n.t(guildId, 'hideout.cameras'), value: camerasDetail, inline: true },
      { name: i18n.t(guildId, 'hideout.guards'), value: guardsDetail, inline: true },
      { name: i18n.t(guildId, 'hideout.passiveIncome'), value: passiveIncomeText, inline: false },
    );

  if (next) {
    embed.addFields({
      name: i18n.t(guildId, 'hideout.nextUpgrade'),
      value: i18n.t(guildId, 'hideout.nextUpgradeDetail', {
        level: next.level,
        price: i18n.formatNumber(next.price, guildId),
      }),
      inline: false,
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('hideout_upgrade').setLabel(i18n.t(guildId, 'hideout.btnUpgrade')).setStyle(ButtonStyle.Primary).setDisabled(!next),
    new ButtonBuilder().setCustomId('hideout_camera').setLabel(i18n.t(guildId, 'hideout.btnCamera')).setStyle(ButtonStyle.Secondary).setDisabled(hideout.cameras >= 3),
    new ButtonBuilder().setCustomId('hideout_guard').setLabel(i18n.t(guildId, 'hideout.btnGuard')).setStyle(ButtonStyle.Secondary).setDisabled(hideout.guards >= 3),
  );
  return { embeds: [embed], components: [row] };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hideout')
    .setDescription('Manage your secret hideout.')
    .setDescriptionLocalizations({
      'fr': 'Gère ta planque secrète.',
      'en-US': 'Manage your secret hideout.',
      'en-GB': 'Manage your secret hideout.',
    }),
  async execute(interaction) {
    const initial = renderHideout(interaction.user.id, interaction.user.username, interaction.guildId);
    if (!initial.embeds.length) return interaction.reply({ ...initial, ephemeral: true });
    await interaction.reply({ ...initial, ephemeral: true });
    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000,
      filter: button => button.user.id === interaction.user.id,
    });
    collector.on('collect', async button => {
      try {
        if (button.customId === 'hideout_upgrade') db.upgradeHideout(interaction.user.id);
        if (button.customId === 'hideout_camera') db.buyHideoutCamera(interaction.user.id);
        if (button.customId === 'hideout_guard') db.buyHideoutGuard(interaction.user.id);
        await button.update(renderHideout(interaction.user.id, interaction.user.username, interaction.guildId));
      } catch (error) {
        await button.reply({ content: `❌ ${error.message}.`, ephemeral: true });
      }
    });
    collector.on('end', () => message.edit({ components: [] }).catch(() => {}));
  },
};
