const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const i18n = require('../../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays the complete list of syndicate commands and their descriptions.')
        .setDescriptionLocalizations({
            'fr': 'Affiche la liste complète des commandes du syndicat et leurs explications.',
            'en-US': 'Displays the complete list of syndicate commands and their descriptions.',
            'en-GB': 'Displays the complete list of syndicate commands and their descriptions.',
        }),
    async execute(interaction) {
        const commands = interaction.client.commands;

        const sortedCommands = Array.from(commands.values()).sort((a, b) =>
            a.data.name.localeCompare(b.data.name)
        );

        const commandList = sortedCommands.map(cmd => {
            const name = cmd.data.name;
            const desc = cmd.data.description || i18n.t(interaction.guildId, 'help.noDesc');
            return `• \`/${name}\` — ${desc}`;
        });

        const embed = new EmbedBuilder()
            .setTitle(i18n.t(interaction.guildId, 'help.title'))
            .setDescription(i18n.t(interaction.guildId, 'help.description', {
                count: commands.size,
                list: commandList.join('\n'),
            }))
            .setColor(0x2B2D31)
            .setFooter({ text: i18n.t(interaction.guildId, 'help.footer') })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
