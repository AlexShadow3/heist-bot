const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const i18n = require('../../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('language')
        .setDescription('Configure la langue du bot pour ce serveur.')
        .setDescriptionLocalizations({
            'fr': 'Configure la langue du bot pour ce serveur.',
            'en-US': 'Configure the bot language for this server.',
            'en-GB': 'Configure the bot language for this server.',
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('language')
                .setDescription('La langue à utiliser / The language to use')
                .setDescriptionLocalizations({
                    'fr': 'La langue à utiliser sur ce serveur.',
                    'en-US': 'The language to use on this server.',
                    'en-GB': 'The language to use on this server.',
                })
                .setRequired(true)
                .addChoices(
                    { name: 'Français 🇫🇷', value: 'fr' },
                    { name: 'English 🇬🇧', value: 'en' },
                )
        ),
    async execute(interaction) {
        if (!interaction.guildId) {
            return interaction.reply({
                content: i18n.t('fr', 'common.guildOnly'),
                ephemeral: true,
            });
        }

        // Vérification des droits administrateur
        if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: i18n.t(interaction.guildId, 'common.adminOnly'),
                ephemeral: true,
            });
        }

        const selectedLang = interaction.options.getString('language');
        db.setGuildLanguage(interaction.guildId, selectedLang);

        const confirmationMsg = i18n.t(selectedLang, 'language.success');
        await interaction.reply({
            content: confirmationMsg,
            ephemeral: false,
        });
    },
};
