const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

const BAIL_COST = 350;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bail')
        .setDescription('Paye la caution d\'un complice en cellule.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Le membre à libérer')
                .setRequired(true)),
    async execute(interaction) {
        const benefactor = db.getPlayer(interaction.user.id);
        const targetUser = interaction.options.getUser('target');

        if (db.isJailed(benefactor)) {
            return interaction.reply({
                content: 'Tu es toi-même en prison, tu ne peux payer la caution de personne !',
                ephemeral: true,
            });
        }

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                content: 'Tu ne peux pas payer ta propre caution, il te faut l\'aide d\'un complice.',
                ephemeral: true,
            });
        }

        const prisoner = db.getPlayer(targetUser.id);
        if (!db.isJailed(prisoner)) {
            return interaction.reply({
                content: `${targetUser.username} n'est pas en cellule.`,
                ephemeral: true,
            });
        }

        if (benefactor.cash < BAIL_COST) {
            return interaction.reply({
                content: `Tu n'as pas assez d'argent ! La caution s'élève à **${BAIL_COST} $** (tu as ${benefactor.cash} $).`,
                ephemeral: true,
            });
        }

        db.addCash(interaction.user.id, -BAIL_COST);
        db.releasePlayer(targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle('Libération sous caution !')
            .setDescription(`⚖️ ${interaction.user} a versé **${BAIL_COST} $** pour faire libérer **${targetUser.username}** de garde à vue !`)
            .setColor(0x57F287);

        await interaction.reply({ embeds: [embed] });
    },
};