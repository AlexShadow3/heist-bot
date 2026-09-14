const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} = require('discord.js');
const db = require('../../database');

const TARGETS = {
    epicerie: { name: 'Épicerie de quartier', loot: [200, 600], successRate: 0.8, jailTime: 2 },
    bijouterie: { name: 'Bijouterie', loot: [800, 2000], successRate: 0.55, jailTime: 5 },
    banque: { name: 'Banque centrale', loot: [3000, 8000], successRate: 0.3, jailTime: 10 },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('heist')
        .setDescription('Organise un braquage avec les membres du serveur.'),
    async execute(interaction) {
        const leader = db.getPlayer(interaction.user.id);
        if (db.isJailed(leader)) {
            const remaining = Math.ceil((leader.jailedUntil - Date.now()) / 60000);
            return interaction.reply({
                content: `🚨 Tu es en prison pour encore ${remaining} minute(s). Tu ne peux pas braquer !`,
                ephemeral: true,
            });
        }

        // Étape 1 : Choix de la cible par le leader
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_target')
            .setPlaceholder('Choisis la cible du braquage')
            .addOptions([
                { label: 'Épicerie (Facile)', description: 'Faible butin, peu de risques (80% succès)', value: 'epicerie' },
                { label: 'Bijouterie (Moyen)', description: 'Bon butin, risque moyen (55% succès)', value: 'bijouterie' },
                { label: 'Banque centrale (Difficile)', description: 'Gros jackpot, haut risque (30% succès)', value: 'banque' },
            ]);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        const initialMsg = await interaction.reply({
            content: '🎯 **Choisis une cible pour lancer le plan :**',
            components: [selectRow],
            fetchReply: true,
        });

        let selectedTargetKey = null;

        try {
            const selectInteraction = await initialMsg.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id,
                componentType: ComponentType.StringSelect,
                time: 30_000,
            });
            selectedTargetKey = selectInteraction.values[0];
            await selectInteraction.deferUpdate();
        } catch {
            return interaction.editReply({ content: 'Temps écoulé, plan annulé.', components: [] });
        }

        const target = TARGETS[selectedTargetKey];
        const team = [interaction.user];

        // Étape 2 : Recrutement du gang (30 secondes)
        const joinBtn = new ButtonBuilder()
            .setCustomId('join_heist')
            .setLabel("Rejoindre l'équipe")
            .setStyle(ButtonStyle.Success);

        const lobbyRow = new ActionRowBuilder().addComponents(joinBtn);

        const updateLobbyEmbed = () => new EmbedBuilder()
            .setTitle(` Braquage préparé : ${target.name}`)
            .setDescription(`Leader : ${interaction.user}\n\n**Équipe actuelle (${team.length}) :**\n${team.map(u => `• ${u.username}`).join('\n')}`)
            .setColor(0xFEE75C)
            .setFooter({ text: 'Fin des préparatifs dans 30 secondes...' });

        const lobbyMsg = await interaction.editReply({
            content: '🚨 Rassemblement du gang ! Cliquez sur le bouton pour participer.',
            embeds: [updateLobbyEmbed()],
            components: [lobbyRow],
        });

        const collector = lobbyMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30_000,
        });

        collector.on('collect', async btnInteraction => {
            const p = db.getPlayer(btnInteraction.user.id);
            if (db.isJailed(p)) {
                return btnInteraction.reply({ content: '🚨 Tu es derrière les barreaux, tu ne peux pas participer.', ephemeral: true });
            }
            if (team.some(u => u.id === btnInteraction.user.id)) {
                return btnInteraction.reply({ content: 'Tu es déjà dans le gang !', ephemeral: true });
            }

            team.push(btnInteraction.user);
            await btnInteraction.reply({ content: 'Tu as rejoint le braquage !', ephemeral: true });
            await interaction.editReply({ embeds: [updateLobbyEmbed()] });
        });

        collector.on('end', async () => {
            // Bonus de 5% de chance de succès par membre additionnel (plafonné à +20%)
            const teamBonus = Math.min((team.length - 1) * 0.05, 0.20);
            const totalSuccessRate = Math.min(target.successRate + teamBonus, 0.95);
            const roll = Math.random();

            if (roll <= totalSuccessRate) {
                // Succès : calcul et partage du loot
                const totalLoot = Math.floor(Math.random() * (target.loot[1] - target.loot[0] + 1)) + target.loot[0];
                const share = Math.floor(totalLoot / team.length);

                team.forEach(member => db.addCash(member.id, share));

                const winEmbed = new EmbedBuilder()
                    .setTitle(' Braquage réussi !')
                    .setDescription(`Le gang s'est échappé de : **${target.name}** !\n\n💰 **Butin total :** ${totalLoot} $\n💸 **Part par membre :** ${share} $ (${team.length} complice(s))`)
                    .setColor(0x57F287);

                await interaction.editReply({ content: null, embeds: [winEmbed], components: [] });
            } else {
                // Échec : tout le monde en prison
                team.forEach(member => db.jailPlayer(member.id, target.jailTime));

                const failEmbed = new EmbedBuilder()
                    .setTitle('🚨 Échec du braquage !')
                    .setDescription(`La police a encerclé la zone à : **${target.name}** !\nToute l'équipe (${team.map(u => u.username).join(', ')}) est envoyée en prison pour **${target.jailTime} minutes** !`)
                    .setColor(0xED4245);

                await interaction.editReply({ content: null, embeds: [failEmbed], components: [] });
            }
        });
    },
};