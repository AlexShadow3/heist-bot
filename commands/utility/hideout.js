const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const db = require('../../database');

function renderHideout(userId, username) {
  const hideout = db.getHideout(userId);
  if (!hideout) return { content: '❌ Tu n\'as pas encore de planque. Utilise `/buy-hideout`.', embeds: [], components: [] };
  const level = db.getHideoutLevel(hideout.level);
  const next = db.getHideoutLevel(hideout.level + 1);
  const embed = new EmbedBuilder()
    .setTitle(`🏚️ Planque de ${username}`)
    .setColor(0x5865F2)
    .addFields(
      { name: 'Niveau', value: `${hideout.level}/10`, inline: true },
      { name: 'Solde sécurisé', value: `${db.getPlayer(userId).stash.toLocaleString('fr-FR')} / ${level.capacity.toLocaleString('fr-FR')} $`, inline: true },
      { name: 'Loyer hebdomadaire', value: `${level.rent.toLocaleString('fr-FR')} $`, inline: true },
      { name: 'Caméras', value: `${hideout.cameras}/3 (−${hideout.cameras * 2} % de saisie)`, inline: true },
      { name: 'Gardes', value: `${hideout.guards}/3 (−${hideout.guards * 5} % de saisie, consommés après un échec)`, inline: true },
      { name: 'Revenu passif', value: hideout.level >= 6 ? `${(1 + (hideout.level - 6) * 0.25).toLocaleString('fr-FR')} % de la capacité chaque lundi` : 'Disponible à partir du niveau 6', inline: false },
    );
  if (next) embed.addFields({ name: 'Prochaine amélioration', value: `Niveau ${next.level} — ${next.price.toLocaleString('fr-FR')} $`, inline: false });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('hideout_upgrade').setLabel('Améliorer').setStyle(ButtonStyle.Primary).setDisabled(!next),
    new ButtonBuilder().setCustomId('hideout_camera').setLabel('Acheter une caméra (25 000 $)').setStyle(ButtonStyle.Secondary).setDisabled(hideout.cameras >= 3),
    new ButtonBuilder().setCustomId('hideout_guard').setLabel('Engager un garde (40 000 $)').setStyle(ButtonStyle.Secondary).setDisabled(hideout.guards >= 3),
  );
  return { embeds: [embed], components: [row] };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hideout')
    .setDescription('Gère ta planque secrète.'),
  async execute(interaction) {
    const initial = renderHideout(interaction.user.id, interaction.user.username);
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
        await button.update(renderHideout(interaction.user.id, interaction.user.username));
      } catch (error) {
        await button.reply({ content: `❌ ${error.message}.`, ephemeral: true });
      }
    });
    collector.on('end', () => message.edit({ components: [] }).catch(() => {}));
  },
};
