const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const i18n = require('../../i18n');

const ESCAPE_FAIL_COOLDOWN_MINUTES = 5;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('escape')
        .setDescription('Attempt to escape from your prison cell.')
        .setDescriptionLocalizations({
            'fr': "Tente de t'évader de ta cellule de prison.",
            'en-US': 'Attempt to escape from your prison cell.',
            'en-GB': 'Attempt to escape from your prison cell.',
        }),
    async execute(interaction) {
        const player = db.getPlayer(interaction.user.id);

        if (!db.isJailed(player)) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'escape.notJailed'),
                ephemeral: true,
            });
        }

        const cooldownUntil = db.getEscapeCooldown(interaction.user.id);
        if (cooldownUntil > Date.now()) {
            const minutesLeft = Math.ceil((cooldownUntil - Date.now()) / 60000);
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'escape.cooldown', { minutes: minutesLeft }),
                ephemeral: true,
            });
        }

        const roll = Math.random();
        const successRate = 0.35;

        if (roll <= successRate) {
            db.releasePlayer(interaction.user.id);

            const winEmbed = new EmbedBuilder()
                .setTitle(i18n.t(interaction.guildId, 'escape.winTitle'))
                .setDescription(i18n.t(interaction.guildId, 'escape.winDesc', { user: interaction.user }))
                .setColor(0x57F287);

            await interaction.reply({ embeds: [winEmbed] });
        } else {
            const extraMinutes = 3;
            db.increaseJailTime(interaction.user.id, extraMinutes);
            db.setEscapeCooldown(interaction.user.id, ESCAPE_FAIL_COOLDOWN_MINUTES);

            const updatedPlayer = db.getPlayer(interaction.user.id);
            const remaining = Math.ceil((updatedPlayer.jailedUntil - Date.now()) / 60000);

            const failEmbed = new EmbedBuilder()
                .setTitle(i18n.t(interaction.guildId, 'escape.failTitle'))
                .setDescription(i18n.t(interaction.guildId, 'escape.failDesc', {
                    extraMinutes,
                    remaining,
                    cooldown: ESCAPE_FAIL_COOLDOWN_MINUTES,
                }))
                .setColor(0xED4245);

            await interaction.reply({ embeds: [failEmbed] });
        }
    },
};