const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const i18n = require('../../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Check your record, cash, stats, and equipment.')
        .setDescriptionLocalizations({
            'fr': 'Consulte ton casier, ton argent, tes statistiques et tes équipements.',
            'en-US': 'Check your record, cash, stats, and equipment.',
            'en-GB': 'Check your record, cash, stats, and equipment.',
        }),
    async execute(interaction) {
        const player = db.getPlayer(interaction.user.id);
        const jailed = db.isJailed(player);
        const hideout = db.getHideout(interaction.user.id);
        const minutesLeft = jailed ? Math.ceil((player.jailedUntil - Date.now()) / 60000) : 0;

        const userInventory = db.getUserInventory(interaction.user.id);
        const inventoryLines = userInventory.map(i => {
            const item = i18n.getItem(i.itemId, interaction.guildId);
            return `• ${item ? item.name : i.itemId} (x${i.quantity})`;
        });

        const lawyerExp = db.getLawyerExpiresAt(interaction.user.id);
        if (lawyerExp > Date.now()) {
            const minLawyer = Math.ceil((lawyerExp - Date.now()) / 60000);
            inventoryLines.push(i18n.t(interaction.guildId, 'profile.lawyerActive', { minutes: minLawyer }));
        }

        const inventoryText = inventoryLines.length > 0 ? inventoryLines.join('\n') : i18n.t(interaction.guildId, 'profile.noEquipment');

        const total = player.heistsTotal || 0;
        const won = player.heistsWon || 0;
        const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

        const hideoutText = hideout
            ? i18n.t(interaction.guildId, 'profile.hideoutLevel', {
                level: hideout.level,
                stash: i18n.formatNumber(player.stash, interaction.guildId),
                capacity: i18n.formatNumber(db.getHideoutLevel(hideout.level).capacity, interaction.guildId),
            })
            : i18n.t(interaction.guildId, 'profile.noHideout');

        const embed = new EmbedBuilder()
            .setTitle(i18n.t(interaction.guildId, 'profile.title', { user: interaction.user.username }))
            .setColor(jailed ? 0xED4245 : 0x57F287)
            .addFields(
                {
                    name: i18n.t(interaction.guildId, 'profile.wallet'),
                    value: i18n.t(interaction.guildId, 'profile.walletValue', { cash: i18n.formatNumber(player.cash, interaction.guildId) }),
                    inline: true,
                },
                {
                    name: i18n.t(interaction.guildId, 'profile.stash'),
                    value: i18n.t(interaction.guildId, 'profile.stashValue', {
                        stash: i18n.formatNumber(player.stash, interaction.guildId),
                        hideoutText,
                    }),
                    inline: true,
                },
                {
                    name: i18n.t(interaction.guildId, 'profile.status'),
                    value: jailed
                        ? i18n.t(interaction.guildId, 'profile.jailedStatus', { minutes: minutesLeft })
                        : i18n.t(interaction.guildId, 'profile.freeStatus'),
                    inline: true,
                },
                {
                    name: i18n.t(interaction.guildId, 'profile.heists'),
                    value: i18n.t(interaction.guildId, 'profile.heistsValue', { won, total, winRate }),
                    inline: false,
                },
                {
                    name: i18n.t(interaction.guildId, 'profile.equipment'),
                    value: inventoryText,
                    inline: false,
                },
            )
            .setThumbnail(interaction.user.displayAvatarURL());

        await interaction.reply({ embeds: [embed] });
    },
};