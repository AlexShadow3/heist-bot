const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const i18n = require('../../i18n');

const BAIL_COST = 350;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bail')
        .setDescription('Paye la caution d\'un complice en cellule.')
        .setDescriptionLocalizations({
            'fr': 'Paye la caution d\'un complice en cellule.',
            'en-US': 'Pay bail for an accomplice in jail.',
            'en-GB': 'Pay bail for an accomplice in jail.',
        })
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Le membre à libérer / Member to bail out')
                .setRequired(true)),
    async execute(interaction) {
        const benefactor = db.getPlayer(interaction.user.id);
        const targetUser = interaction.options.getUser('target');

        if (db.isJailed(benefactor)) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'bail.benefactorJailed'),
                ephemeral: true,
            });
        }

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'bail.selfBail'),
                ephemeral: true,
            });
        }

        const prisoner = db.getPlayer(targetUser.id);
        if (!db.isJailed(prisoner)) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'bail.notJailed', { user: targetUser.username }),
                ephemeral: true,
            });
        }

        if (benefactor.cash < BAIL_COST) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'bail.notEnoughCash', {
                    cost: i18n.formatNumber(BAIL_COST, interaction.guildId),
                    cash: i18n.formatNumber(benefactor.cash, interaction.guildId),
                }),
                ephemeral: true,
            });
        }

        db.debitCash(interaction.user.id, BAIL_COST);
        db.releasePlayer(targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle(i18n.t(interaction.guildId, 'bail.title'))
            .setDescription(i18n.t(interaction.guildId, 'bail.description', {
                user: interaction.user,
                cost: i18n.formatNumber(BAIL_COST, interaction.guildId),
                target: targetUser.username,
            }))
            .setColor(0x57F287);

        await interaction.reply({ embeds: [embed] });
    },
};