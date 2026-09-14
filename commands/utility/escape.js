const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');

const ESCAPE_FAIL_COOLDOWN_MINUTES = 5;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('escape')
        .setDescription("Tente de t'évader de ta cellule de prison."),
    async execute(interaction) {
        const player = db.getPlayer(interaction.user.id);

        if (!db.isJailed(player)) {
            return interaction.reply({
                content: "Tu n'es pas en prison, inutile de t'évader !",
                ephemeral: true,
            });
        }

        // Vérification du cooldown après échec
        const cooldownUntil = db.getEscapeCooldown(interaction.user.id);
        if (cooldownUntil > Date.now()) {
            const minutesLeft = Math.ceil((cooldownUntil - Date.now()) / 60000);
            return interaction.reply({
                content: `🚨 Les gardiens surveillent étroitement ta cellule après ta dernière tentative ! Attends encore **${minutesLeft} minute(s)** avant de réessayer.`,
                ephemeral: true,
            });
        }

        const roll = Math.random();
        const successRate = 0.35;

        if (roll <= successRate) {
            db.releasePlayer(interaction.user.id);

            const winEmbed = new EmbedBuilder()
                .setTitle('Évasion réussie !')
                .setDescription(`🏃‍♂️💨 ${interaction.user} a profité d'un moment d'inattention des gardes pour franchir les grillages ! Tu es de nouveau libre.`)
                .setColor(0x57F287);

            await interaction.reply({ embeds: [winEmbed] });
        } else {
            // Échec : ajout de temps de prison + cooldown de 5 minutes
            const extraMinutes = 3;
            db.increaseJailTime(interaction.user.id, extraMinutes);
            db.setEscapeCooldown(interaction.user.id, ESCAPE_FAIL_COOLDOWN_MINUTES);

            const updatedPlayer = db.getPlayer(interaction.user.id);
            const remaining = Math.ceil((updatedPlayer.jailedUntil - Date.now()) / 60000);

            const failEmbed = new EmbedBuilder()
                .setTitle('🚨 Évasion manquée !')
                .setDescription(`Les projecteurs t'ont repéré dans la cour ! Un garde t'a intercepté.\n\nSanction : **+${extraMinutes} minutes** de peine ajoutée(s). Il te reste désormais **${remaining} minute(s)** en cellule.\n⏱️ *Prochaine tentative possible dans ${ESCAPE_FAIL_COOLDOWN_MINUTES} minutes.*`)
                .setColor(0xED4245);

            await interaction.reply({ embeds: [failEmbed] });
        }
    },
};