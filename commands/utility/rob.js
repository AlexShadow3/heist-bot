const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

const COOLDOWN_MINUTES = 60;
const MIN_TARGET_CASH = 200;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Tente de détrousser un autre joueur du serveur.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('La cible à détrousser')
                .setRequired(true)),
    async execute(interaction) {
        const robber = db.getPlayer(interaction.user.id);
        const targetUser = interaction.options.getUser('target');

        // Vérifications de base
        if (db.isJailed(robber)) {
            const remaining = Math.ceil((robber.jailedUntil - Date.now()) / 60000);
            return interaction.reply({
                content: `🚨 Tu es en prison pour encore ${remaining} minute(s). Impossible de braquer qui que ce soit !`,
                ephemeral: true,
            });
        }

        if (targetUser.bot) {
            return interaction.reply({
                content: 'Les bots ne transportent pas de cash ! Trouve une cible humaine.',
                ephemeral: true,
            });
        }

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                content: 'Tu ne peux pas te braquer toi-même...',
                ephemeral: true,
            });
        }

        // Cooldown du voleur
        const cooldownUntil = db.getRobCooldown(interaction.user.id);
        if (cooldownUntil > Date.now()) {
            const minutesLeft = Math.ceil((cooldownUntil - Date.now()) / 60000);
            return interaction.reply({
                content: `⏳ Tu as récemment attiré l'attention ! Attends encore **${minutesLeft} minute(s)** avant ton prochain vol à la tire.`,
                ephemeral: true,
            });
        }

        const victim = db.getPlayer(targetUser.id);

        // Vérification de la cible
        if (db.isJailed(victim)) {
            return interaction.reply({
                content: `🔒 ${targetUser.username} est déjà derrière les barreaux, impossible d'accéder à ses poches.`,
                ephemeral: true,
            });
        }

        if (victim.cash < MIN_TARGET_CASH) {
            return interaction.reply({
                content: `🛡️ ${targetUser.username} est trop fauché(e) (moins de ${MIN_TARGET_CASH} $). Un criminel digne de ce nom cible de vrais poissons !`,
                ephemeral: true,
            });
        }

        // Enregistrement du cooldown
        db.setRobCooldown(interaction.user.id, COOLDOWN_MINUTES);

        const roll = Math.random();
        const successRate = 0.45; // 45% de chances de réussite

        if (roll <= successRate) {
            // Pourcentage volé : entre 15% et 30%
            const percentage = Math.random() * (0.30 - 0.15) + 0.15;
            const stolenAmount = Math.max(1, Math.floor(victim.cash * percentage));

            db.transferCash(targetUser.id, interaction.user.id, stolenAmount);

            const winEmbed = new EmbedBuilder()
                .setTitle('🦹 Vol à la tire réussi !')
                .setDescription(`Dans une ruelle sombre, ${interaction.user} a braqué **${targetUser.username}** et lui a dérobé **${stolenAmount} $** !`)
                .setColor(0x57F287);

            await interaction.reply({ embeds: [winEmbed] });
        } else {
            // Échec : 3 minutes de prison
            const jailMinutes = 3;
            db.jailPlayer(interaction.user.id, jailMinutes);

            const failEmbed = new EmbedBuilder()
                .setTitle('🚨 Pris en flagrant délit !')
                .setDescription(`${targetUser.username} s'est débattu(e) et a alerté une patrouille ! ${interaction.user} a été maîtrisé et écope de **${jailMinutes} minutes de prison** !`)
                .setColor(0xED4245);

            await interaction.reply({ embeds: [failEmbed] });
        }
    },
};