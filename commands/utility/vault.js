const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vault')
        .setDescription('Consulte la cagnotte saisie stockée dans le Coffre des forces de l\'ordre de ce serveur.'),
    async execute(interaction) {
        if (!interaction.guildId) {
            return interaction.reply({
                content: 'Cette commande doit être exécutée dans un serveur.',
                ephemeral: true,
            });
        }

        const vaultAmount = db.getPoliceVault(interaction.guildId);

        const embed = new EmbedBuilder()
            .setTitle(`🏛️ Coffre des forces de l'ordre — ${interaction.guild.name}`)
            .setDescription(
                `Ce coffre contient toutes les saisies et amendes confisquées aux braqueurs de ce serveur lors de leurs arrestations.\n\n` +
                `💰 **Montant actuel sous scellés :**\n` +
                `# ${vaultAmount.toLocaleString('fr-FR')} $\n\n` +
                `*Utilise \`/heist\` avec un **Badge d'accès corrompu** pour tenter d'infiltrer la salle des preuves et récupérer ce butin !*`
            )
            .setColor(0x3498DB)
            .setFooter({ text: 'Syndicate Crime Bot • Cagnotte locale au serveur' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};