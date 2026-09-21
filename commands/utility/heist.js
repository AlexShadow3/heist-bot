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

// Registre en mémoire pour empêcher de participer à plusieurs braquages simultanément
const activePlayers = new Set();

const TARGETS = {
    epicerie: {
        name: 'Épicerie',
        loot: [200, 600],
        successRate: 0.80,
        jailTime: 2,
        optionalItem: 'crowbar',
        bonusRate: 0.10,
        btnLabel: 'Utiliser Pied-de-biche (+10 %)',
        cooldownMinutes: 5, // Gain faible -> 5 min
    },
    bijouterie: {
        name: 'Bijouterie de quartier',
        loot: [800, 2000],
        successRate: 0.60,
        jailTime: 5,
        optionalItem: 'bolt_cutter',
        bonusRate: 0.10,
        btnLabel: 'Utiliser Coupe-boulon (+10 %)',
        cooldownMinutes: 15, // Gain moyen -> 15min
    },
    banque_quartier: {
        name: 'Banque de quartier',
        loot: [2000, 4500],
        successRate: 0.45,
        jailTime: 7,
        requires: 'jammer',
        hack: {
            title: 'BOÎTIER D\'ALARME - BANQUE DE QUARTIER',
            length: 4,
            time: 8_000,
            bonus: 0.10,
        },
        cooldownMinutes: 30, // Gain élevé -> 30 min
    },
    magasin_luxe: {
        name: 'Magasin de luxe',
        loot: [3500, 7500],
        successRate: 0.40,
        jailTime: 8,
        requires: 'lockpick_kit',
        hack: {
            title: 'VITRINES CONNECTÉES - MAGASIN DE LUXE',
            length: 6,
            time: 11_000,
            bonus: 0.15,
        },
        cooldownMinutes: 45, // Gain très élevé -> 45min
    },
    banque: {
        name: 'Banque centrale',
        loot: [6000, 15000],
        successRate: 0.25,
        jailTime: 12,
        requires: 'drill',
        hack: {
            title: 'SERVEUR MAINFRAME - BANQUE CENTRALE',
            length: 8,
            time: 14_000,
            bonus: 0.25,
        },
        cooldownMinutes: 60, // Gain extrême -> 1h
    },
    coffre_police: {
        name: 'Coffre des forces de l\'ordre',
        isPoliceVault: true,
        jailTime: 15,
        requires: 'police_badge',
        hack: {
            title: 'SALLE DES SCIELLÉS & PREUVES - QG DE POLICE',
            length: 10,
            time: 18_000,
        },
        cooldownMinutes: 120, // Jackpot -> 2h
    },
};

const KEY_ITEMS = ['key_bronze', 'key_silver', 'key_gold', 'key_diamond', 'key_special'];
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
        if (!interaction.guildId) {
            return interaction.reply({
                content: 'Cette commande ne peut être exécutée que dans un serveur.',
                ephemeral: true,
            });
        }

        const leader = db.getPlayer(interaction.user.id);
        if (db.isJailed(leader)) {
            const remaining = Math.ceil((leader.jailedUntil - Date.now()) / 60000);
            return interaction.reply({
                content: `🚨 Tu es en cellule pour encore ${remaining} minute(s). Impossible de braquer.`,
                ephemeral: true,
            });
        }

        // Vérification d'activité en cours
        if (activePlayers.has(interaction.user.id)) {
            return interaction.reply({
                content: 'Tu es déjà en train de préparer ou de participer à un braquage !',
                ephemeral: true,
            });
        }

        activePlayers.add(interaction.user.id);

        const currentVault = db.getPoliceVault(interaction.guildId);
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_target')
            .setPlaceholder('Choisis la cible du braquage')
            .addOptions([
                { label: '1. Épicerie', description: 'Facile (80 % succès) | Pied-de-biche optionnel', value: 'epicerie' },
                { label: '2. Bijouterie de quartier', description: 'Moyen (60 % succès) | Coupe-boulon optionnel', value: 'bijouterie' },
                { label: '3. Banque de quartier', description: 'Difficile (45 % succès) | Brouilleur requis + Hack (4 touches)', value: 'banque_quartier' },
                { label: '4. Magasin de luxe', description: 'Très difficile (40 % succès) | Kit crochetage requis + Hack (6 touches)', value: 'magasin_luxe' },
                { label: '5. Banque centrale', description: 'Extrême (25 % succès) | Perceuse requise + Hack expert (8 touches)', value: 'banque' },
                { label: '6. Coffre des forces de l\'ordre', description: `Cagnotte : ${currentVault.toLocaleString('fr-FR')}$ | Badge requis + Hack élite (10 touches)`, value: 'coffre_police' },
            ]);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        const initialMsg = await interaction.reply({
            content: '📌 **Choisis une cible dans le menu ci-dessous :**',
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
            await selectInteraction.deferUpdate();
        } catch {
            activePlayers.delete(interaction.user.id);
            return interaction.editReply({ content: 'Temps écoulé, plan annulé.', components: [] });
        }

        const target = TARGETS[selectedKey];

        // Vérification du cooldown spécifique à la cible
        const targetCooldown = db.getHeistCooldown(interaction.user.id, selectedKey);
        if (targetCooldown > Date.now()) {
            activePlayers.delete(interaction.user.id);
            const minutesLeft = Math.ceil((targetCooldown - Date.now()) / 60000);
            return interaction.followUp({
                content: `⏳ Tu ne peux pas encore attaquer **${target.name}**. Tu dois attendre encore **${minutesLeft} minute(s)**.`,
                ephemeral: true,
            });
        }

        if (target.requires && db.getItemQuantity(interaction.user.id, target.requires) < 1) {
            activePlayers.delete(interaction.user.id);
            const reqName = items[target.requires]?.name || target.requires;
            return interaction.followUp({
                content: `❌ Tu n'as pas l'équipement requis (**${reqName}**) pour lancer ce braquage ! Passe par le \`/shop\`.`,
                ephemeral: true,
            });
        }

        let team = [interaction.user];
        let isCancelled = false;
        let toolUser = null;
        let keyCommitment = null;

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
        const keyBtn = new ButtonBuilder()
            .setCustomId('use_key')
            .setLabel('Activer une Clé')
            .setStyle(ButtonStyle.Secondary);

        const lobbyComponents = [joinBtn, leaveBtn, cancelBtn, keyBtn];
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
                    ? `\n🔧 **Équipement activé :** ${items[target.optionalItem].name} par${toolUser.username}`
                    : `\n🔧 **Équipement disponible :** Aucun activé`;
            }
            let keyStatus = keyCommitment
                ? `\n🔑 **Multiplicateur engagé :** ${items[keyCommitment.itemId].name} par${keyCommitment.user.username}`
                : '';
            let extraInfo = '';
            if (target.isPoliceVault) {
                extraInfo = `\n🚨 **Objectif :** Infiltration de la salle des scellés (butin tiré au sort : 20 % ou rafle totale 100 %)`;
            }
            return new EmbedBuilder()
                .setTitle(`Préparation : ${target.name}`)
                .setDescription(`Leader : ${interaction.user}\n\n**Équipe actuelle (${team.length}) :**\n${team.map(u => `👤 ${u.username}`).join('\n')}${toolStatus}${keyStatus}${extraInfo}`)
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
                team.forEach(u => activePlayers.delete(u.id));
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
                if (keyCommitment && keyCommitment.user.id === btnInteraction.user.id) {
                    keyCommitment = null;
                }
                team = team.filter(u => u.id !== btnInteraction.user.id);
                activePlayers.delete(btnInteraction.user.id);
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
                if (activePlayers.has(btnInteraction.user.id)) {
                    return btnInteraction.reply({ content: 'Tu participes déjà à un autre braquage !', ephemeral: true });
                }

                // Vérification du cooldown pour l'équipier
                const memberCd = db.getHeistCooldown(btnInteraction.user.id, selectedKey);
                if (memberCd > Date.now()) {
                    const minutesLeft = Math.ceil((memberCd - Date.now()) / 60000);
                    return btnInteraction.reply({
                        content: `⏳ Tu ne peux pas attaquer **${target.name}** tout de suite. Attends encore **${minutesLeft} minute(s)**.`,
                        ephemeral: true,
                    });
                }

                activePlayers.add(btnInteraction.user.id);
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

            if (btnInteraction.customId === 'use_key') {
                if (!team.some(u => u.id === btnInteraction.user.id)) {
                    return btnInteraction.reply({ content: 'Tu dois d\'abord rejoindre l\'équipe pour engager une clé.', ephemeral: true });
                }
                const availableKeys = KEY_ITEMS.filter(k => db.getItemQuantity(btnInteraction.user.id, k) > 0);
                if (availableKeys.length === 0) {
                    return btnInteraction.reply({
                        content: '🔑 Tu ne possèdes aucune clé de butin (Bronze, Argent, Or, Diamant ou Spéciale) ! Achète-en au `/shop`.',
                        ephemeral: true,
                    });
                }
                const keyOptions = availableKeys.map(k => ({
                    label: items[k].name,
                    description: items[k].description.slice(0, 100),
                    value: k,
                }));
                const keyMenu = new StringSelectMenuBuilder()
                    .setCustomId(`select_key_${btnInteraction.id}`)
                    .setPlaceholder('Choisis la clé à consommer')
                    .addOptions(keyOptions);
                const keyMenuRow = new ActionRowBuilder().addComponents(keyMenu);
                const keyPrompt = await btnInteraction.reply({
                    content: '🔑 Choisis la clé à engager pour ce braquage (elle sera **consommée définitivement**, succès ou échec) :',
                    components: [keyMenuRow],
                    ephemeral: true,
                    fetchReply: true,
                });
                try {
                    const keySelection = await keyPrompt.awaitMessageComponent({
                        componentType: ComponentType.StringSelect,
                        time: 20_000,
                    });
                    const chosenKeyId = keySelection.values[0];
                    keyCommitment = {
                        user: btnInteraction.user,
                        itemId: chosenKeyId,
                    };
                    await keySelection.update({
                        content: `🔑 Tu as engagé une **${items[chosenKeyId].name}** ! Le butin de l'équipe sera multiplié si le braquage réussit.`,
                        components: [],
                    });
                    return lobbyMsg.edit({ embeds: [renderLobby()] });
                } catch {
                    return btnInteraction.editReply({ content: 'Sélection de la clé expirée.', components: [] });
                }
            }
        });

        lobbyCollector.on('end', async () => {
            if (isCancelled) return;

            let isFullVault = false;
            if (target.isPoliceVault) {
                isFullVault = Math.random() <= 0.15;
            }

            let hackBonus = 0;
            if (target.hack) {
                const hacker = team[Math.floor(Math.random() * team.length)];
                const { length: seqLen, time: hackTime, title: hackTitle } = target.hack;
                let hackRate = target.hack.bonus || 0;

                if (target.isPoliceVault) {
                    hackRate = isFullVault ? 0.05 : 0.10;
                }

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
                    .setDescription(`🎯 **Hacker désigné d'office :** ${hacker} !\n\nReproduis la séquence de **${seqLen} touches** dans les **${hackTime / 1000} secondes** :\n\n# ${sequenceDisplay}\n\nProgression : \`[ ${Array(seqLen).fill('.').join(' ')} ]\``)
                    .setColor(0x3498DB)
                    .setFooter({ text: `Seul ${hacker.username} peut interagir avec ce boîtier !` });

                await lobbyMsg.edit({
                    content: `⚠️ **PIRATAGE EN COURS... C'est à ${hacker} de jouer !**`,
                    embeds: [hackEmbed],
                    components: [hackRow],
                });

                const hackCollector = lobbyMsg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: hackTime,
                });

                let hackFinished = false;

                for await (const [btnInteraction] of hackCollector[Symbol.asyncIterator]()) {
                    if (btnInteraction.user.id !== hacker.id) {
                        await btnInteraction.reply({
                            content: `❌ Pas touche ! Seul le hacker désigné (**${hacker.username}**) manipule le terminal !`,
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
                                        .setTitle('✅ PARE-FEU NEUTRALISÉ !')
                                        .setDescription(`**${hacker.username}** a débloqué les systèmes à temps ! (+${Math.round(hackRate * 100)} % de chances)`)
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
                                    .setDescription(`Erreur critique de **${hacker.username}** ! Les forces spéciales sont alertées ! (-${Math.round(hackRate * 100)} % de chances)`)
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

            let keyMultiplier = 1;
            let keyConsumedText = '';
            if (keyCommitment) {
                const hasKey = db.consumeItem(keyCommitment.user.id, keyCommitment.itemId);
                if (hasKey) {
                    if (keyCommitment.itemId === 'key_bronze') keyMultiplier = 2;
                    else if (keyCommitment.itemId === 'key_silver') keyMultiplier = 3;
                    else if (keyCommitment.itemId === 'key_gold') keyMultiplier = 5;
                    else if (keyCommitment.itemId === 'key_diamond') keyMultiplier = 10;
                    else if (keyCommitment.itemId === 'key_special') {
                        const rollPossibilities = [2, 3, 5, 10, 20];
                        keyMultiplier = rollPossibilities[Math.floor(Math.random() * rollPossibilities.length)];
                    }
                    keyConsumedText = `🔑 **${keyCommitment.user.username}** a utilisé une **${items[keyCommitment.itemId].name}** (x${keyMultiplier} aux gains) ! Clé consommée.`;
                }
            }

            let baseRate = target.successRate;
            let rawLoot = 0;
            let vaultDetailsText = '';
            if (target.isPoliceVault) {
                const currentTotal = db.getPoliceVault(interaction.guildId);
                if (isFullVault) {
                    baseRate = 0.05;
                    rawLoot = currentTotal;
                    vaultDetailsText = `🎰 **JACKPOT DÉCLENCHÉ :** Vous avez forcé le compartiment principal (**100 % du coffre**) !`;
                } else {
                    baseRate = 0.20;
                    rawLoot = Math.floor(currentTotal * 0.20);
                    vaultDetailsText = `🕵️ **INFILTRATION DISCRÈTE :** Vous avez accédé au casier secondaire (**20 % du coffre**) !`;
                }
            } else {
                rawLoot = Math.floor(Math.random() * (target.loot[1] - target.loot[0] + 1)) + target.loot[0];
            }

            const calculatedTotalLoot = rawLoot * keyMultiplier;
            const teamBonus = Math.min((team.length - 1) * 0.05, 0.20);
            const toolBonus = (toolUser && target.optionalItem) ? target.bonusRate : 0;
            const totalSuccessRate = Math.max(0.01, Math.min(baseRate + teamBonus + toolBonus + hackBonus, 0.95));
            const roll = Math.random();
            const expectedSharePerMember = Math.floor(calculatedTotalLoot / team.length);

            if (roll <= totalSuccessRate && calculatedTotalLoot > 0) {
                const share = expectedSharePerMember;
                team.forEach(m => {
                    db.addCash(m.id, share);
                    db.recordHeistAttempt(m.id, true);
                });
                if (target.isPoliceVault) {
                    db.takeFromPoliceVault(interaction.guildId, rawLoot);
                }
                const winEmbed = new EmbedBuilder()
                    .setTitle('💰 Braquage réussi !')
                    .setDescription(
                        `Le gang s'est échappé de : **${target.name}** !\n\n` +
                        (vaultDetailsText ? `${vaultDetailsText}\n\n` : '') +
                        (keyConsumedText ? `${keyConsumedText}\n\n` : '') +
                        `💵 **Butin total :** ${calculatedTotalLoot.toLocaleString('fr-FR')} $` +
                        (keyMultiplier > 1 ? ` *(x${keyMultiplier} appliqué !)*` : '') +
                        `\n👤 **Part individuelle :** ${share.toLocaleString('fr-FR')} $ (${team.length} membre(s))`
                    )
                    .setColor(0x57F287);
                await lobbyMsg.edit({ content: null, embeds: [winEmbed], components: [] });
            } else {
                team.forEach(m => db.recordHeistAttempt(m.id, false));
                const itemLossMessages = [];
                if (keyConsumedText) {
                    itemLossMessages.push(keyConsumedText);
                }
                if (toolUser && target.optionalItem) {
                    db.consumeItem(toolUser.id, target.optionalItem);
                    itemLossMessages.push(`🔧 Le/La **${items[target.optionalItem].name}** de **${toolUser.username}** s'est brisé(e) pendant la fuite !`);
                }
                if (target.requires) {
                    db.consumeItem(interaction.user.id, target.requires);
                    itemLossMessages.push(`👮 Le matériel obligatoire (**${items[target.requires].name}**) du chef a été confisqué par la police !`);
                }

                const baseSharePerMember = Math.floor(rawLoot / team.length);
                const baselineLoot = baseSharePerMember > 0 ? baseSharePerMember : 500;
                const seizureMessages = [];

                team.forEach(member => {
                    const baseFine = Math.floor(baselineLoot * 0.50);
                    const protection = db.getHideoutProtection(member.id);
                    const cameraReduction = protection.cameras * 0.02;
                    const guardReduction = protection.guards * 0.05;
                    const finePerMember = Math.floor(baseFine * Math.max(0, 1 - cameraReduction - guardReduction));
                    const guardUsed = protection.guards > 0 && db.consumeHideoutGuard(member.id);
                    const { totalSeized, takenFromStash, takenFromCash } = db.seizeFine(interaction.guildId, member.id, finePerMember);

                    if (totalSeized > 0) {
                        const protectionText = cameraReduction || guardUsed ? `, protection à ${Math.round((cameraReduction + guardReduction) * 100)} %` : '';
                        seizureMessages.push(`💸 **${member.username}** : **${totalSeized.toLocaleString('fr-FR')} $** saisis *(🏦 ${takenFromStash.toLocaleString('fr-FR')} $ planque, 💵 ${takenFromCash.toLocaleString('fr-FR')} $ cash${protectionText})*`);
                    } else {
                        seizureMessages.push(`💸 **${member.username}** : Insolvable, rien à saisir.`);
                    }
                });

                const outcomes = [];
                for (const member of team) {
                    if (db.consumeItem(member.id, 'vest')) {
                        outcomes.push(`🛡️ **${member.username}** a évité la prison grâce à son gilet pare-balles (consommé) !`);
                    } else {
                        let sentence = target.jailTime;
                        if (db.hasActiveLawyer(member.id)) {
                            sentence = Math.max(1, Math.floor(sentence / 2));
                            outcomes.push(`⚖️ **${member.username}** : ${sentence} min (peine réduite par l'avocat)`);
                        } else {
                            outcomes.push(`🚨 **${member.username}** : ${sentence} min de cellule`);
                        }
                        db.jailPlayer(member.id, sentence);
                    }
                }

                const failEmbed = new EmbedBuilder()
                    .setTitle('❌ Échec du braquage !')
                    .setDescription(
                        `L'alarme a retenti et les forces de l'ordre ont coincé le gang à : **${target.name}** !\n\n` +
                        (vaultDetailsText ? `${vaultDetailsText}\n\n` : '') +
                        `${itemLossMessages.length > 0 ? itemLossMessages.join('\n') + '\n\n' : ''}` +
                        `**👮 Saisies policières (versées au coffre des flics) :**\n${seizureMessages.join('\n')}\n\n` +
                        `**🚨 Peines de prison :**\n${outcomes.join('\n')}`
                    )
                    .setColor(0xED4245);
                await lobbyMsg.edit({ content: null, embeds: [failEmbed], components: [] });
            }

            // Nettoyage de la liste active et application des cooldowns de la cible
            team.forEach(m => {
                db.setHeistCooldown(m.id, selectedKey, target.cooldownMinutes);
                activePlayers.delete(m.id);
            });
        });
    },
};