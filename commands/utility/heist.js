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
    epicerie: { name: 'Épicerie', loot: [200, 600], successRate: 0.8, jailTime: 2 },
    bijouterie: { name: 'Bijouterie', loot: [800, 2000], successRate: 0.55, jailTime: 5 },
    banque: { name: 'Banque centrale', loot: [3000, 8000], successRate: 0.3, jailTime: 10, requires: 'drill' },
};

const HACK_KEYS = [
    { id: 'btn_red', label: 'Rouge', emoji: '🔴', style: ButtonStyle.Danger },
    { id: 'btn_blue', label: 'Bleu', emoji: '🔵', style: ButtonStyle.Primary },
    { id: 'btn_green', label: 'Vert', emoji: '🟢', style: ButtonStyle.Success },
    { id: 'btn_yellow', label: 'Jaune', emoji: '🟡', style: ButtonStyle.Secondary },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('heist')
        .setDescription('Organise un braquage en équipe avec mini-jeux tactiques.'),
    async execute(interaction) {
        const leader = db.getPlayer(interaction.user.id);
        if (db.isJailed(leader)) {
            const remaining = Math.ceil((leader.jailedUntil - Date.now()) / 60000);
            return interaction.reply({
                content: `🚨 Tu es en cellule pour encore ${remaining} minute(s). Impossible de braquer.`,
                ephemeral: true,
            });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_target')
            .setPlaceholder('Choisis la cible du braquage')
            .addOptions([
                { label: 'Épicerie', description: 'Faible butin, peu de risques (80% succès)', value: 'epicerie' },
                { label: 'Bijouterie', description: 'Bon butin, risque moyen (55% succès)', value: 'bijouterie' },
                { label: 'Banque centrale (Perceuse requise + Hack)', description: 'Jackpot massif, mini-jeu sous pression', value: 'banque' },
            ]);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        // Étape 1 : Menu de sélection éphémère (visible uniquement par le leader)
        const initialMsg = await interaction.reply({
            content: '🎯 **Choisis une cible dans le menu ci-dessous :**',
            components: [selectRow],
            ephemeral: true,
            fetchReply: true,
        });

        let selectedKey = null;
        try {
            const selectInteraction = await initialMsg.awaitMessageComponent({
                componentType: ComponentType.StringSelect,
                time: 30_000,
            });
            selectedKey = selectInteraction.values[0];
            await selectInteraction.update({
                content: '✅ Cible sélectionnée. Les préparatifs commencent dans le salon.',
                components: [],
            });
        } catch {
            return interaction.editReply({ content: 'Temps écoulé, plan annulé.', components: [] });
        }

        const target = TARGETS[selectedKey];

        if (target.requires && db.getItemQuantity(interaction.user.id, target.requires) < 1) {
            return interaction.followUp({
                content: `❌ Tu n'as pas l'équipement requis (**${target.requires}**) pour braquer cette cible ! Passe par le \`/shop\`.`,
                ephemeral: true,
            });
        }

        let team = [interaction.user];
        let isCancelled = false;

        // Étape 2 : Création du lobby public avec boutons d'action
        const joinBtn = new ButtonBuilder()
            .setCustomId('join_heist')
            .setLabel("Rejoindre l'équipe")
            .setStyle(ButtonStyle.Success);

        const leaveBtn = new ButtonBuilder()
            .setCustomId('leave_heist')
            .setLabel("Quitter l'équipe")
            .setStyle(ButtonStyle.Secondary);

        const cancelBtn = new ButtonBuilder()
            .setCustomId('cancel_heist')
            .setLabel('Annuler le braquage')
            .setStyle(ButtonStyle.Danger);

        const lobbyRow = new ActionRowBuilder().addComponents(joinBtn, leaveBtn, cancelBtn);

        const renderLobby = () => new EmbedBuilder()
            .setTitle(`🔫 Préparation : ${target.name}`)
            .setDescription(`Leader : ${interaction.user}\n\n**Équipe actuelle (${team.length}) :**\n${team.map(u => `• ${u.username}`).join('\n')}`)
            .setColor(0xFEE75C)
            .setFooter({ text: 'Départ du convoi dans 30 secondes...' });

        const lobbyMsg = await interaction.channel.send({
            content: `🚨 **${interaction.user.username}** prépare un braquage sur **${target.name}** !`,
            embeds: [renderLobby()],
            components: [lobbyRow],
        });

        const lobbyCollector = lobbyMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30_000,
        });

        lobbyCollector.on('collect', async btnInteraction => {
            // Cas 1 : Annulation par le leader
            if (btnInteraction.customId === 'cancel_heist') {
                if (btnInteraction.user.id !== interaction.user.id) {
                    return btnInteraction.reply({
                        content: "❌ Seul l'organisateur du braquage peut annuler l'opération.",
                        ephemeral: true,
                    });
                }

                isCancelled = true;
                lobbyCollector.stop('cancelled');
                await btnInteraction.update({
                    content: '🛑 **Braquage annulé par le chef d\'équipe.**',
                    embeds: [],
                    components: [],
                });
                return;
            }

            // Cas 2 : Quitter l'équipe
            if (btnInteraction.customId === 'leave_heist') {
                if (btnInteraction.user.id === interaction.user.id) {
                    return btnInteraction.reply({
                        content: 'En tant que leader, tu ne peux pas quitter ton propre braquage. Utilise plutôt le bouton "Annuler".',
                        ephemeral: true,
                    });
                }

                if (!team.some(u => u.id === btnInteraction.user.id)) {
                    return btnInteraction.reply({
                        content: 'Tu ne fais pas partie de l\'équipe.',
                        ephemeral: true,
                    });
                }

                team = team.filter(u => u.id !== btnInteraction.user.id);
                await btnInteraction.reply({ content: 'Tu as quitté l\'équipe de braquage.', ephemeral: true });
                await lobbyMsg.edit({ embeds: [renderLobby()] });
                return;
            }

            // Cas 3 : Rejoindre l'équipe
            if (btnInteraction.customId === 'join_heist') {
                const p = db.getPlayer(btnInteraction.user.id);
                if (db.isJailed(p)) {
                    return btnInteraction.reply({ content: '🚨 Tu es en cellule, tu ne peux pas participer.', ephemeral: true });
                }
                if (team.some(u => u.id === btnInteraction.user.id)) {
                    return btnInteraction.reply({ content: 'Tu es déjà dans l\'équipe.', ephemeral: true });
                }

                team.push(btnInteraction.user);
                await btnInteraction.reply({ content: 'Tu as rejoint l\'équipe !', ephemeral: true });
                await lobbyMsg.edit({ embeds: [renderLobby()] });
            }
        });

        lobbyCollector.on('end', async () => {
            if (isCancelled) return;

            let hackBonus = 0;

            // Étape 3 : Mini-jeu de hacking si Banque centrale
            if (selectedKey === 'banque') {
                const sequenceLength = 4;
                const sequence = Array.from({ length: sequenceLength }, () =>
                    HACK_KEYS[Math.floor(Math.random() * HACK_KEYS.length)]
                );

                const sequenceDisplay = sequence.map(k => k.emoji).join('  ');
                let currentStep = 0;

                const hackButtons = HACK_KEYS.map(k =>
                    new ButtonBuilder()
                        .setCustomId(k.id)
                        .setLabel(k.label)
                        .setEmoji(k.emoji)
                        .setStyle(k.style)
                );

                const hackRow = new ActionRowBuilder().addComponents(hackButtons);

                const hackEmbed = new EmbedBuilder()
                    .setTitle('💻 TERMINAL DE SÉCURITÉ — BANQUE CENTRALE')
                    .setDescription(`**${interaction.user}**, court-circuite le pare-feu !\nReproduis la séquence exacte suivante dans les 10 secondes :\n\n# ${sequenceDisplay}\n\nProgression : \`[ . . . . ]\``)
                    .setColor(0x3498DB)
                    .setFooter({ text: 'Seul le leader peut manipuler le boîtier de piratage.' });

                await lobbyMsg.edit({
                    content: '⚡ **HACKING EN COURS...**',
                    embeds: [hackEmbed],
                    components: [hackRow],
                });

                const hackCollector = lobbyMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 10_000,
                });

                let hackSuccess = false;

                for await (const [btnInteraction] of hackCollector[Symbol.asyncIterator]()) {
                    if (btnInteraction.user.id !== interaction.user.id) {
                        await btnInteraction.reply({ content: 'Seul le hacker en chef peut manipuler ce boîtier.', ephemeral: true });
                        continue;
                    }

                    if (btnInteraction.customId === sequence[currentStep].id) {
                        currentStep++;
                        const progress = sequence.map((_, idx) => (idx < currentStep ? '✓' : '.')).join(' ');

                        if (currentStep === sequenceLength) {
                            hackSuccess = true;
                            hackBonus = 0.25;
                            await btnInteraction.update({
                                embeds: [
                                    new EmbedBuilder()
                                        .setTitle('🔓 PARE-FEU DÉSACTIVÉ !')
                                        .setDescription('Caméras neutralisées et portes blindées déverrouillées ! (+25 % de succès)')
                                        .setColor(0x57F287),
                                ],
                                components: [],
                            });
                            hackCollector.stop('completed');
                            break;
                        } else {
                            hackEmbed.setDescription(`**${interaction.user}**, court-circuite le pare-feu !\nSéquence :\n\n# ${sequenceDisplay}\n\nProgression : \`[ ${progress} ]\``);
                            await btnInteraction.update({ embeds: [hackEmbed] });
                        }
                    } else {
                        hackCollector.stop('failed');
                        await btnInteraction.update({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle('🚨 ALARME SILENCIEUSE DÉCLENCHÉE !')
                                    .setDescription('Mauvaise combinaison de fils coupés ! Les unités d\'intervention foncent sur zone ! (-25 % de succès)')
                                    .setColor(0xED4245),
                            ],
                            components: [],
                        });
                        break;
                    }
                }

                if (!hackSuccess && currentStep < sequenceLength) {
                    hackBonus = -0.25;
                }

                await new Promise(r => setTimeout(r, 2500));
            }

            // Étape 4 : Résolution du braquage
            const teamBonus = Math.min((team.length - 1) * 0.05, 0.20);
            let itemBonus = 0;
            if (selectedKey === 'epicerie' && team.some(m => db.getItemQuantity(m.id, 'crowbar') > 0)) {
                itemBonus += 0.10;
            }

            const totalSuccessRate = Math.max(0.05, Math.min(target.successRate + teamBonus + itemBonus + hackBonus, 0.95));
            const roll = Math.random();

            if (roll <= totalSuccessRate) {
                const totalLoot = Math.floor(Math.random() * (target.loot[1] - target.loot[0] + 1)) + target.loot[0];
                const share = Math.floor(totalLoot / team.length);
                team.forEach(m => db.addCash(m.id, share));

                const winEmbed = new EmbedBuilder()
                    .setTitle('💰 Braquage réussi !')
                    .setDescription(`Le gang s'est échappé de : **${target.name}** !\n\n💸 **Butin total :** ${totalLoot.toLocaleString('fr-FR')} $\n💵 **Part individuelle :** ${share.toLocaleString('fr-FR')} $ (${team.length} membres)`)
                    .setColor(0x57F287);

                await lobbyMsg.edit({ content: null, embeds: [winEmbed], components: [] });
            } else {
                const outcomes = [];

                for (const member of team) {
                    if (db.consumeItem(member.id, 'vest')) {
                        outcomes.push(`🛡️ **${member.username}** a esquivé la prison grâce à son gilet pare-balles (consommé) !`);
                    } else {
                        let sentence = target.jailTime;
                        if (db.getItemQuantity(member.id, 'lawyer') > 0) {
                            sentence = Math.max(1, Math.floor(sentence / 2));
                            outcomes.push(`⚖️ **${member.username}** : ${sentence} min (peine réduite par son avocat)`);
                        } else {
                            outcomes.push(`🚨 **${member.username}** : ${sentence} min de cellule`);
                        }
                        db.jailPlayer(member.id, sentence);
                    }
                }

                const failEmbed = new EmbedBuilder()
                    .setTitle('🚨 Échec du braquage !')
                    .setDescription(`Le RAID et la police ont bouclé la zone à : **${target.name}** !\n\n${outcomes.join('\n')}`)
                    .setColor(0xED4245);

                await lobbyMsg.edit({ content: null, embeds: [failEmbed], components: [] });
            }
        });
    },
};