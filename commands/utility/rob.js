const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const i18n = require('../../i18n');

const COOLDOWN_MINUTES = 60;
const MIN_TARGET_CASH = 200;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Tente de détrousser un autre joueur du serveur.')
        .setDescriptionLocalizations({
            'fr': 'Tente de détrousser un autre joueur du serveur.',
            'en-US': 'Attempt to mug another player on the server.',
            'en-GB': 'Attempt to mug another player on the server.',
        })
        .addUserOption(option =>
            option.setName('target')
                .setDescription('La cible à détrousser / The target to mug')
                .setRequired(true)),
    async execute(interaction) {
        const robber = db.getPlayer(interaction.user.id);
        const targetUser = interaction.options.getUser('target');

        // Vérifications de base
        if (db.isJailed(robber)) {
            const remaining = Math.ceil((robber.jailedUntil - Date.now()) / 60000);
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'rob.jailed', { minutes: remaining }),
                ephemeral: true,
            });
        }

        if (targetUser.bot) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'rob.botTarget'),
                ephemeral: true,
            });
        }

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'rob.selfTarget'),
                ephemeral: true,
            });
        }

        // Cooldown du voleur
        const cooldownUntil = db.getRobCooldown(interaction.user.id);
        if (cooldownUntil > Date.now()) {
            const minutesLeft = Math.ceil((cooldownUntil - Date.now()) / 60000);
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'rob.cooldown', { minutes: minutesLeft }),
                ephemeral: true,
            });
        }

        const victim = db.getPlayer(targetUser.id);

        // Vérification de la cible
        if (db.isJailed(victim)) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'rob.targetJailed', { user: targetUser.username }),
                ephemeral: true,
            });
        }

        if (victim.cash < MIN_TARGET_CASH) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'rob.targetBroke', {
                    user: targetUser.username,
                    min: i18n.formatNumber(MIN_TARGET_CASH, interaction.guildId),
                }),
                ephemeral: true,
            });
        }

        // Enregistrement du cooldown
        db.setRobCooldown(interaction.user.id, COOLDOWN_MINUTES);

        const roll = Math.random();
        const successRate = 0.45; // 45% de chances de réussite

        if (roll <= successRate) {
            const percentage = Math.random() * (0.30 - 0.15) + 0.15;
            const stolenAmount = Math.max(1, Math.floor(victim.cash * percentage));

            db.transferCash(targetUser.id, interaction.user.id, stolenAmount);

            const winEmbed = new EmbedBuilder()
                .setTitle(i18n.t(interaction.guildId, 'rob.winTitle'))
                .setDescription(i18n.t(interaction.guildId, 'rob.winDesc', {
                    robber: interaction.user,
                    victim: targetUser.username,
                    amount: i18n.formatNumber(stolenAmount, interaction.guildId),
                }))
                .setColor(0x57F287);

            await interaction.reply({ embeds: [winEmbed] });
        } else {
            const jailMinutes = 3;
            db.jailPlayer(interaction.user.id, jailMinutes);

            const failEmbed = new EmbedBuilder()
                .setTitle(i18n.t(interaction.guildId, 'rob.failTitle'))
                .setDescription(i18n.t(interaction.guildId, 'rob.failDesc', {
                    victim: targetUser.username,
                    robber: interaction.user,
                    jailMinutes,
                }))
                .setColor(0xED4245);

            await interaction.reply({ embeds: [failEmbed] });
        }
    },
};