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
const items = require('../../items');

const TARGETS = {
    epicerie: {
        name: 'Épicerie',
        loot: [200, 600],
        successRate: 0.8,
        jailTime: 2,
        optionalItem: 'crowbar',
        bonusRate: 0.10,
        btnLabel: 'Utiliser Pied-de-biche (+10 %)',
    },
    bijouterie: {
        name: 'Bijouterie de quartier',
        loot: [800, 2000],
        successRate: 0.60,
        jailTime: 5,
        optionalItem: 'bolt_cutter',
        bonusRate: 0.10,
        btnLabel: 'Utiliser Coupe-boulon (+10 %)',
    },
    banque_quartier: {
        name: 'Banque de quartier',
        loot: [2000, 4500],
        successRate: 0.45,
        jailTime: 7,
        requires: 'jammer',
    },
    magasin_luxe: {
        name: 'Magasin de luxe',
        loot: [3500, 7500],
        successRate: 0.40,
        jailTime: 8,
        requires: 'lockpick_kit',
        hack: {
            title: 'VITRINES CONNECTÉES - MAGASIN DE LUXE',
            length: 4,
            time: 8_000,
            bonus: 0.15,
        }
    },
    banque: {
        name: 'Banque centrale',
        loot: [6000, 15000],
        successRate: 0.25,
        jailTime: 12,
        requires: 'drill',
        hack: {
            title: 'SERVEUR MAINFRAME — BANQUE CENTRALE',
            length: 6,
            time: 7_000,
            bonus: 0.25,
        },
    },
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
                { label: '1. Épicerie', description: 'Facile (80 % succès) | Pied-de-biche optionnel', value: 'epicerie' },
                { label: '2. Bijouterie de quartier', description: 'Moyen (60 % succès) | Coupe-boulon optionnel', value: 'bijouterie' },
                { label: '3. Banque de quartier', description: 'Difficile (45 % succès) | Brouilleur radio requis', value: 'banque_quartier' },
                { label: '4. Magasin de luxe', description: 'Très difficile (40 % succès) | Kit crochetage requis + Hack', value: 'magasin_luxe' },
                { label: '5. Banque centrale', description: 'Extrême (25 % succès) | Perceuse requise + Hack expert', value: 'banque' },
            ]);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

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
            const reqName = items[target.requires]?.name || target.requires;
            return interaction.followUp({
                content: `❌ Tu n'as pas l'équipement requis (**${reqName}**) pour lancer ce braquage ! Passe par le \`/shop\`.`,
                ephemeral: true,
            });
        }

        let team = [interaction.user];
        let isCancelled = false;
        let toolUser = null;

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

        const lobbyComponents = [joinBtn, leaveBtn, cancelBtn];

        if (target.optionalItem) {
            const useToolBtn = new ButtonBuilder()
                .setCustomId('use_tool')
                .setLabel(target.btnLabel)
                .setStyle(ButtonStyle.Primary);
            lobbyComponents.push(useToolBtn);
        }

        const lobbyRow = new ActionRowBuilder().addComponents(lobbyComponents);

        const renderLobby = () => {
            let toolStatus = '';
            if (target.optionalItem) {
                toolStatus = toolUser
                    ? `\n🔧 **Équipement activé :** ${items[target.optionalItem].name} par ${toolUser.username}`
                    : `\n🔧 **Équipement disponible :** Aucun activé (cliquez sur le bouton bleu)`;
            }

            return new EmbedBuilder()
                .setTitle(`Préparation : ${target.name}`)
                .setDescription(`Leader : ${interaction.user}\n\n**Équipe actuelle (${team.length}) :**\n${team.map(u => `• ${u.username}`).join('\n')}${toolStatus}`)
                .setColor(0xFEE75C)
                .setFooter({ text: 'Départ du convoi dans 30 secondes...' });
        };

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
            if (btnInteraction.customId === 'cancel_heist') {
                if (btnInteraction.user.id !== interaction.user.id) {
                    return btnInteraction.reply({
                        content: "❌ Seul l'organisateur du braquage peut annuler l'opération.",
                        ephemeral: true,
                    });
                }
                isCancelled = true;
                lobbyCollector.stop('cancelled');
                return btnInteraction.update({
                    content: '🛑 **Braquage annulé par le chef d\'équipe.**',
                    embeds: [],
                    components: [],
                });
            }

            if (btnInteraction.customId === 'leave_heist') {
                if (btnInteraction.user.id === interaction.user.id) {
                    return btnInteraction.reply({
                        content: 'En tant que leader, utilise le bouton "Annuler".',
                        ephemeral: true,
                    });
                }
                if (!team.some(u => u.id === btnInteraction.user.id)) {
                    return btnInteraction.reply({ content: 'Tu ne fais pas partie de l\'équipe.', ephemeral: true });
                }
                if (toolUser && toolUser.id === btnInteraction.user.id) {
                    toolUser = null;
                }
                team = team.filter(u => u.id !== btnInteraction.user.id);
                await btnInteraction.reply({ content: 'Tu as quitté l\'équipe de braquage.', ephemeral: true });
                return lobbyMsg.edit({ embeds: [renderLobby()] });
            }

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
                return lobbyMsg.edit({ embeds: [renderLobby()] });
            }

            if (btnInteraction.customId === 'use_tool') {
                if (!team.some(u => u.id === btnInteraction.user.id)) {
                    return btnInteraction.reply({ content: 'Tu dois rejoindre l\'équipe avant d\'utiliser ton matériel.', ephemeral: true });
                }
                if (db.getItemQuantity(btnInteraction.user.id, target.optionalItem) < 1) {
                    return btnInteraction.reply({
                        content: `❌ Tu ne possèdes pas de **${items[target.optionalItem].name}** dans ton inventaire ! Achète-le au \`/shop\`.`,
                        ephemeral: true,
                    });
                }
                toolUser = btnInteraction.user;
                await btnInteraction.reply({
                    content: `🔧 Tu as engagé ton **${items[target.optionalItem].name}** pour ce braquage (+${Math.round(target.bonusRate * 100)} % succès) ! Attention, il se brisera en cas d'échec.`,
                    ephemeral: true,
                });
                return lobbyMsg.edit({ embeds: [renderLobby()] });
            }
        });

        lobbyCollector.on('end', async () => {
            if (isCancelled) return;

            let hackBonus = 0;

            // Mini-jeu de piratage si configuré sur la cible
            if (target.hack) {
                // Sélection aléatoire d'un hacker parmi tous les membres du gang
                const hacker = team[Math.floor(Math.random() * team.length)];

                const { length: seqLen, time: hackTime, bonus: hackRate, title: hackTitle } = target.hack;
                const sequence = Array.from({ length: seqLen }, () =>
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
                    .setTitle(`💻 ${hackTitle}`)
                    .setDescription(`🎯 **Hacker désigné d'office :** ${hacker} !\n\nReproduis la séquence dans les **${hackTime / 1000} secondes** :\n\n# ${sequenceDisplay}\n\nProgression : \`[ ${Array(seqLen).fill('.').join(' ')} ]\``)
                    .setColor(0x3498DB)
                    .setFooter({ text: `Seul ${hacker.username} peut interagir avec ce boîtier !` });

                await lobbyMsg.edit({
                    content: `⚡ **PIRATAGE EN COURS... C'est à ${hacker} de jouer !**`,
                    embeds: [hackEmbed],
                    components: [hackRow],
                });

                const hackCollector = lobbyMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: hackTime,
                });

                let hackFinished = false;

                for await (const [btnInteraction] of hackCollector[Symbol.asyncIterator]()) {
                    // Seul le hacker sélectionné aléatoirement a la main
                    if (btnInteraction.user.id !== hacker.id) {
                        await btnInteraction.reply({
                            content: `⚠️ Pas touche ! Seul le hacker désigné (**${hacker.username}**) a les câbles en main !`,
                            ephemeral: true,
                        });
                        continue;
                    }

                    if (btnInteraction.customId === sequence[currentStep].id) {
                        currentStep++;
                        const progress = sequence.map((_, idx) => (idx < currentStep ? '✓' : '.')).join(' ');

                        if (currentStep === seqLen) {
                            hackFinished = true;
                            hackBonus = hackRate;
                            await btnInteraction.update({
                                embeds: [
                                    new EmbedBuilder()
                                        .setTitle('🔓 SYSTÈMES DÉCONNECTÉS !')
                                        .setDescription(`**${hacker.username}** a neutralisé la sécurité à temps ! (+${Math.round(hackRate * 100)} % de chances)`)
                                        .setColor(0x57F287),
                                ],
                                components: [],
                            });
                            hackCollector.stop('completed');
                            break;
                        } else {
                            hackEmbed.setDescription(`🎯 **Hacker désigné :** ${hacker} !\n\nSéquence :\n\n# ${sequenceDisplay}\n\nProgression : \`[ ${progress} ]\``);
                            await btnInteraction.update({ embeds: [hackEmbed] });
                        }
                    } else {
                        hackFinished = true;
                        hackBonus = -hackRate;
                        hackCollector.stop('failed');
                        await btnInteraction.update({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle('🚨 ALARME SILENCIEUSE DÉCLENCHÉE !')
                                    .setDescription(`Erreur critique de **${hacker.username}** ! Les sirènes hurlent ! (-${Math.round(hackRate * 100)} % de chances)`)
                                    .setColor(0xED4245),
                            ],
                            components: [],
                        });
                        break;
                    }
                }

                if (!hackFinished && currentStep < seqLen) {
                    hackBonus = -hackRate;
                }

                await new Promise(r => setTimeout(r, 2500));
            }

            // Calcul des bonus finaux
            const teamBonus = Math.min((team.length - 1) * 0.05, 0.20);
            const toolBonus = (toolUser && target.optionalItem) ? target.bonusRate : 0;
            const totalSuccessRate = Math.max(0.05, Math.min(target.successRate + teamBonus + toolBonus + hackBonus, 0.95));
            const roll = Math.random();

            if (roll <= totalSuccessRate) {
                const totalLoot = Math.floor(Math.random() * (target.loot[1] - target.loot[0] + 1)) + target.loot[0];
                const share = Math.floor(totalLoot / team.length);
                team.forEach(m => {
                    db.addCash(m.id, share);
                    db.recordHeistAttempt(m.id, true);
                });

                const winEmbed = new EmbedBuilder()
                    .setTitle('💰 Braquage réussi !')
                    .setDescription(`Le gang s'est échappé de : **${target.name}** !\n\n💸 **Butin total :** ${totalLoot.toLocaleString('fr-FR')} $\n💵 **Part individuelle :** ${share.toLocaleString('fr-FR')} $ (${team.length} membre(s))`)
                    .setColor(0x57F287);

                await lobbyMsg.edit({ content: null, embeds: [winEmbed], components: [] });
            } else {
                const itemLossMessages = [];

                team.forEach(m => {
                    db.recordHeistAttempt(m.id, false);
                });

                if (toolUser && target.optionalItem) {
                    db.consumeItem(toolUser.id, target.optionalItem);
                    itemLossMessages.push(`💥 Le/La **${items[target.optionalItem].name}** de **${toolUser.username}** s'est brisé(e) pendant la fuite !`);
                }

                if (target.requires) {
                    db.consumeItem(interaction.user.id, target.requires);
                    itemLossMessages.push(`⚠️ Le matériel obligatoire (**${items[target.requires].name}**) du chef a été confisqué par la police !`);
                }

                const outcomes = [];
                for (const member of team) {
                    if (db.consumeItem(member.id, 'vest')) {
                        outcomes.push(`🛡️ **${member.username}** a évité la prison grâce à son gilet pare-balles (consommé) !`);
                    } else {
                        let sentence = target.jailTime;
                        if (db.hasActiveLawyer(member.id)) {
                            sentence = Math.max(1, Math.floor(sentence / 2));
                            outcomes.push(`⚖️ **${member.username}** : ${sentence} min (peine réduite de moitié par son avocat)`);
                        } else {
                            outcomes.push(`🚨 **${member.username}** : ${sentence} min de cellule`);
                        }
                        db.jailPlayer(member.id, sentence);
                    }
                }

                const failEmbed = new EmbedBuilder()
                    .setTitle('🚨 Échec du braquage !')
                    .setDescription(`L'alarme a retenti et les forces de l'ordre ont coincé le gang à : **${target.name}** !\n\n${itemLossMessages.length > 0 ? itemLossMessages.join('\n') + '\n\n' : ''}${outcomes.join('\n')}`)
                    .setColor(0xED4245);

                await lobbyMsg.edit({ content: null, embeds: [failEmbed], components: [] });
            }
        });
    },
};