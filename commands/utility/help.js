const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Affiche la liste complète des commandes du syndicat et leurs explications.'),
    async execute(interaction) {
        const commands = interaction.client.commands;

        const sortedCommands = Array.from(commands.values()).sort((a, b) =>
            a.data.name.localeCompare(b.data.name)
        );

        const commandList = sortedCommands.map(cmd => {
            const name = cmd.data.name;
            const desc = cmd.data.description || 'Aucune description fournie.';
            return `• \`/${name}\` — ${desc}`;
        });

        const embed = new EmbedBuilder()
            .setTitle('📖 Guide du Syndicat — Commandes disponibles')
            .setDescription(`Voici la liste des **${commands.size} commandes** enregistrées :\n\n${commandList.join('\n')}`)
            .setColor(0x2B2D31)
            .setFooter({ text: 'Syndicate Crime Bot • Mise à jour automatique' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
