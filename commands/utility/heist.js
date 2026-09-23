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
const i18n = require('../../i18n');

// Registre en mémoire pour empêcher de participer à plusieurs braquages simultanément
const activePlayers = new Set();

const BASE_TARGETS = {
    epicerie: {
        loot: [200, 600],
        successRate: 0.80,
        jailTime: 2,
        optionalItem: 'crowbar',
        bonusRate: 0.10,
        cooldownMinutes: 5,
    },
    bijouterie: {
        loot: [800, 2000],
        successRate: 0.60,
        jailTime: 5,
        optionalItem: 'bolt_cutter',
        bonusRate: 0.10,
        cooldownMinutes: 15,
    },
    banque_quartier: {
        loot: [2000, 4500],
        successRate: 0.45,
        jailTime: 7,
        requires: 'jammer',
        hack: {
            length: 4,
            time: 8_000,
            bonus: 0.10,
        },
        cooldownMinutes: 30,
    },
    magasin_luxe: {
        loot: [3500, 7500],
        successRate: 0.40,
        jailTime: 8,
        requires: 'lockpick_kit',
        hack: {
            length: 6,
            time: 11_000,
            bonus: 0.15,
        },
        cooldownMinutes: 45,
    },
    banque: {
        loot: [6000, 15000],
        successRate: 0.25,
        jailTime: 12,
        requires: 'drill',
        hack: {
            length: 8,
            time: 14_000,
            bonus: 0.25,
        },
        cooldownMinutes: 60,
    },
    coffre_police: {
        isPoliceVault: true,
        jailTime: 15,
        requires: 'police_badge',
        hack: {
            length: 10,
            time: 18_000,
        },
        cooldownMinutes: 120,
    },
};

const KEY_ITEMS = ['key_bronze', 'key_silver', 'key_gold', 'key_diamond', 'key_special'];

function getTargetInfo(key, guildId, vaultAmount = 0) {
    const base = BASE_TARGETS[key];
    const name = i18n.t(guildId, `heist.targets.${key}.name`);
    const descTemplate = i18n.t(guildId, `heist.targets.${key}.description`, {
        amount: i18n.formatNumber(vaultAmount, guildId),
    });
    const btnLabel = i18n.t(guildId, `heist.targets.${key}.btnLabel`);
    const hackTitle = i18n.t(guildId, `heist.targets.${key}.hackTitle`);

    return {
        ...base,
        name,
        description: descTemplate,
        btnLabel: btnLabel !== `heist.targets.${key}.btnLabel` ? btnLabel : undefined,
        hack: base.hack ? { ...base.hack, title: hackTitle } : undefined,
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('heist')
        .setDescription('Organize a team heist with tactical mini-games.')
        .setDescriptionLocalizations({
            'fr': 'Organise un braquage en équipe avec mini-jeux tactiques.',
            'en-US': 'Organize a team heist with tactical mini-games.',
            'en-GB': 'Organize a team heist with tactical mini-games.',
        }),
    async execute(interaction) {
        if (!interaction.guildId) {
            return interaction.reply({
                content: i18n.t('en', 'common.guildOnly'),
                ephemeral: true,
            });
        }

        const guildId = interaction.guildId;
        const leader = db.getPlayer(interaction.user.id);
        if (db.isJailed(leader)) {
            const remaining = Math.ceil((leader.jailedUntil - Date.now()) / 60000);
            return interaction.reply({
                content: i18n.t(guildId, 'heist.jailed', { minutes: remaining }),
                ephemeral: true,
            });
        }

        if (activePlayers.has(interaction.user.id)) {
            return interaction.reply({
                content: i18n.t(guildId, 'heist.alreadyInHeist'),
                ephemeral: true,
            });
        }

        activePlayers.add(interaction.user.id);

        const currentVault = db.getPoliceVault(guildId);
        const targetKeys = ['epicerie', 'bijouterie', 'banque_quartier', 'magasin_luxe', 'banque', 'coffre_police'];
        const options = targetKeys.map((k, index) => {
            const tInfo = getTargetInfo(k, guildId, currentVault);
            return {
                label: `${index + 1}. ${tInfo.name}`,
                description: tInfo.description.slice(0, 100),
                value: k,
            };
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_target')
            .setPlaceholder(i18n.t(guildId, 'heist.selectPlaceholder'))
            .addOptions(options);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        const initialMsg = await interaction.reply({
            content: i18n.t(guildId, 'heist.selectPrompt'),
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
            return interaction.editReply({ content: i18n.t(guildId, 'heist.timeoutCancelled'), components: [] });
        }

        const target = getTargetInfo(selectedKey, guildId, currentVault);

        // Vérification du cooldown spécifique à la cible
        const targetCooldown = db.getHeistCooldown(interaction.user.id, selectedKey);
        if (targetCooldown > Date.now()) {
            activePlayers.delete(interaction.user.id);
            const minutesLeft = Math.ceil((targetCooldown - Date.now()) / 60000);
            return interaction.followUp({
                content: i18n.t(guildId, 'heist.targetCooldown', { target: target.name, minutes: minutesLeft }),
                ephemeral: true,
            });
        }

        if (target.requires && db.getItemQuantity(interaction.user.id, target.requires) < 1) {
            activePlayers.delete(interaction.user.id);
            const reqItem = i18n.getItem(target.requires, guildId);
            const reqName = reqItem ? reqItem.name : target.requires;
            return interaction.followUp({
                content: i18n.t(guildId, 'heist.missingEquipment', { item: reqName }),
                ephemeral: true,
            });
        }

        let team = [interaction.user];
        let isCancelled = false;
        let toolUser = null;
        let keyCommitment = null;

        const joinBtn = new ButtonBuilder()
            .setCustomId('join_heist')
            .setLabel(i18n.t(guildId, 'heist.btnJoin'))
            .setStyle(ButtonStyle.Success);
        const leaveBtn = new ButtonBuilder()
            .setCustomId('leave_heist')
            .setLabel(i18n.t(guildId, 'heist.btnLeave'))
            .setStyle(ButtonStyle.Secondary);
        const cancelBtn = new ButtonBuilder()
            .setCustomId('cancel_heist')
            .setLabel(i18n.t(guildId, 'heist.btnCancel'))
            .setStyle(ButtonStyle.Danger);
        const keyBtn = new ButtonBuilder()
            .setCustomId('use_key')
            .setLabel(i18n.t(guildId, 'heist.btnUseKey'))
            .setStyle(ButtonStyle.Secondary);

        const lobbyComponents = [joinBtn, leaveBtn, cancelBtn, keyBtn];
        if (target.optionalItem) {
            const useToolBtn = new ButtonBuilder()
                .setCustomId('use_tool')
                .setLabel(target.btnLabel || i18n.t(guildId, 'heist.btnJoin'))
                .setStyle(ButtonStyle.Primary);
            lobbyComponents.push(useToolBtn);
        }

        const lobbyRow = new ActionRowBuilder().addComponents(lobbyComponents);
        const renderLobby = () => {
            let toolStatus = '';
            if (target.optionalItem) {
                const optItem = i18n.getItem(target.optionalItem, guildId);
                toolStatus = toolUser
                    ? i18n.t(guildId, 'heist.lobbyToolActivated', { item: optItem.name, user: toolUser.username })
                    : i18n.t(guildId, 'heist.lobbyToolNone');
            }
            let keyStatus = '';
            if (keyCommitment) {
                const kItem = i18n.getItem(keyCommitment.itemId, guildId);
                keyStatus = i18n.t(guildId, 'heist.lobbyKeyActivated', { item: kItem.name, user: keyCommitment.user.username });
            }
            let extraInfo = '';
            if (target.isPoliceVault) {
                extraInfo = i18n.t(guildId, 'heist.lobbyPoliceExtra');
            }
            const teamLines = team.map(u => `👤 ${u.username}`).join('\n');
            return new EmbedBuilder()
                .setTitle(i18n.t(guildId, 'heist.lobbyPreparation', { target: target.name }))
                .setDescription(i18n.t(guildId, 'heist.lobbyDescription', {
                    leader: interaction.user,
                    count: team.length,
                    team: teamLines,
                    toolStatus,
                    keyStatus,
                    extraInfo,
                }))
                .setColor(0xFEE75C)
                .setFooter({ text: i18n.t(guildId, 'heist.lobbyFooter') });
        };

        const lobbyMsg = await interaction.channel.send({
            content: i18n.t(guildId, 'heist.lobbyAnnouncement', { user: interaction.user.username, target: target.name }),
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
                        content: i18n.t(guildId, 'heist.cancelOnlyLeader'),
                        ephemeral: true,
                    });
                }
                isCancelled = true;
                team.forEach(u => activePlayers.delete(u.id));
                lobbyCollector.stop('cancelled');
                return btnInteraction.update({
                    content: i18n.t(guildId, 'heist.cancelledByLeader'),
                    embeds: [],
                    components: [],
                });
            }

            if (btnInteraction.customId === 'leave_heist') {
                if (btnInteraction.user.id === interaction.user.id) {
                    return btnInteraction.reply({
                        content: i18n.t(guildId, 'heist.leaveLeaderWarn'),
                        ephemeral: true,
                    });
                }
                if (!team.some(u => u.id === btnInteraction.user.id)) {
                    return btnInteraction.reply({ content: i18n.t(guildId, 'heist.notInTeam'), ephemeral: true });
                }
                if (toolUser && toolUser.id === btnInteraction.user.id) {
                    toolUser = null;
                }
                if (keyCommitment && keyCommitment.user.id === btnInteraction.user.id) {
                    keyCommitment = null;
                }
                team = team.filter(u => u.id !== btnInteraction.user.id);
                activePlayers.delete(btnInteraction.user.id);
                await btnInteraction.reply({ content: i18n.t(guildId, 'heist.leftTeam'), ephemeral: true });
                return lobbyMsg.edit({ embeds: [renderLobby()] });
            }

            if (btnInteraction.customId === 'join_heist') {
                const p = db.getPlayer(btnInteraction.user.id);
                if (db.isJailed(p)) {
                    return btnInteraction.reply({ content: i18n.t(guildId, 'heist.joinJailed'), ephemeral: true });
                }
                if (team.some(u => u.id === btnInteraction.user.id)) {
                    return btnInteraction.reply({ content: i18n.t(guildId, 'heist.alreadyInTeam'), ephemeral: true });
                }
                if (activePlayers.has(btnInteraction.user.id)) {
                    return btnInteraction.reply({ content: i18n.t(guildId, 'heist.alreadyInHeist'), ephemeral: true });
                }

                const memberCd = db.getHeistCooldown(btnInteraction.user.id, selectedKey);
                if (memberCd > Date.now()) {
                    const minutesLeft = Math.ceil((memberCd - Date.now()) / 60000);
                    return btnInteraction.reply({
                        content: i18n.t(guildId, 'heist.targetCooldown', { target: target.name, minutes: minutesLeft }),
                        ephemeral: true,
                    });
                }

                activePlayers.add(btnInteraction.user.id);
                team.push(btnInteraction.user);
                await btnInteraction.reply({ content: i18n.t(guildId, 'heist.joinedTeam'), ephemeral: true });
                return lobbyMsg.edit({ embeds: [renderLobby()] });
            }

            if (btnInteraction.customId === 'use_tool') {
                if (!team.some(u => u.id === btnInteraction.user.id)) {
                    return btnInteraction.reply({ content: i18n.t(guildId, 'heist.toolMustJoinFirst'), ephemeral: true });
                }
                const optItem = i18n.getItem(target.optionalItem, guildId);
                if (db.getItemQuantity(btnInteraction.user.id, target.optionalItem) < 1) {
                    return btnInteraction.reply({
                        content: i18n.t(guildId, 'heist.toolNotOwned', { item: optItem.name }),
                        ephemeral: true,
                    });
                }
                toolUser = btnInteraction.user;
                await btnInteraction.reply({
                    content: i18n.t(guildId, 'heist.toolActivated', {
                        item: optItem.name,
                        bonus: Math.round(target.bonusRate * 100),
                    }),
                    ephemeral: true,
                });
                return lobbyMsg.edit({ embeds: [renderLobby()] });
            }

            if (btnInteraction.customId === 'use_key') {
                if (!team.some(u => u.id === btnInteraction.user.id)) {
                    return btnInteraction.reply({ content: i18n.t(guildId, 'heist.keyMustJoinFirst'), ephemeral: true });
                }
                const availableKeys = KEY_ITEMS.filter(k => db.getItemQuantity(btnInteraction.user.id, k) > 0);
                if (availableKeys.length === 0) {
                    return btnInteraction.reply({
                        content: i18n.t(guildId, 'heist.keyNoneOwned'),
                        ephemeral: true,
                    });
                }
                const keyOptions = availableKeys.map(k => {
                    const itemData = i18n.getItem(k, guildId);
                    return {
                        label: itemData.name,
                        description: itemData.description.slice(0, 100),
                        value: k,
                    };
                });
                const keyMenu = new StringSelectMenuBuilder()
                    .setCustomId(`select_key_${btnInteraction.id}`)
                    .setPlaceholder(i18n.t(guildId, 'heist.keySelectPlaceholder'))
                    .addOptions(keyOptions);
                const keyMenuRow = new ActionRowBuilder().addComponents(keyMenu);
                const keyPrompt = await btnInteraction.reply({
                    content: i18n.t(guildId, 'heist.keySelectPrompt'),
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
                    const chosenItem = i18n.getItem(chosenKeyId, guildId);
                    keyCommitment = {
                        user: btnInteraction.user,
                        itemId: chosenKeyId,
                    };
                    await keySelection.update({
                        content: i18n.t(guildId, 'heist.keyEngaged', { item: chosenItem.name }),
                        components: [],
                    });
                    return lobbyMsg.edit({ embeds: [renderLobby()] });
                } catch {
                    return btnInteraction.editReply({ content: i18n.t(guildId, 'heist.keySelectExpired'), components: [] });
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

                const HACK_KEYS = [
                    { id: 'btn_red', label: i18n.t(guildId, 'heist.hackButtons.red'), emoji: '🔴', style: ButtonStyle.Danger },
                    { id: 'btn_blue', label: i18n.t(guildId, 'heist.hackButtons.blue'), emoji: '🔵', style: ButtonStyle.Primary },
                    { id: 'btn_green', label: i18n.t(guildId, 'heist.hackButtons.green'), emoji: '🟢', style: ButtonStyle.Success },
                    { id: 'btn_yellow', label: i18n.t(guildId, 'heist.hackButtons.yellow'), emoji: '🟡', style: ButtonStyle.Secondary },
                ];

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
                    .setDescription(i18n.t(guildId, 'heist.hackSequencePrompt', {
                        hacker: hacker,
                        count: seqLen,
                        time: hackTime / 1000,
                        display: sequenceDisplay,
                        progress: Array(seqLen).fill('.').join(' '),
                    }))
                    .setColor(0x3498DB)
                    .setFooter({ text: i18n.t(guildId, 'heist.hackFooter', { hacker: hacker.username }) });

                await lobbyMsg.edit({
                    content: i18n.t(guildId, 'heist.hackTurnAnnouncement', { hacker: hacker }),
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
                            content: i18n.t(guildId, 'heist.hackNotHacker', { hacker: hacker.username }),
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
                                        .setTitle(i18n.t(guildId, 'heist.hackSuccessTitle'))
                                        .setDescription(i18n.t(guildId, 'heist.hackSuccessDesc', {
                                            hacker: hacker.username,
                                            bonus: Math.round(hackRate * 100),
                                        }))
                                        .setColor(0x57F287),
                                ],
                                components: [],
                            });
                            hackCollector.stop('completed');
                            break;
                        } else {
                            hackEmbed.setDescription(i18n.t(guildId, 'heist.hackSequencePrompt', {
                                hacker: hacker,
                                count: seqLen,
                                time: hackTime / 1000,
                                display: sequenceDisplay,
                                progress,
                            }));
                            await btnInteraction.update({ embeds: [hackEmbed] });
                        }
                    } else {
                        hackFinished = true;
                        hackBonus = -hackRate;
                        hackCollector.stop('failed');
                        await btnInteraction.update({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle(i18n.t(guildId, 'heist.hackFailTitle'))
                                    .setDescription(i18n.t(guildId, 'heist.hackFailDesc', {
                                        hacker: hacker.username,
                                        penalty: Math.round(hackRate * 100),
                                    }))
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
                    const kItem = i18n.getItem(keyCommitment.itemId, guildId);
                    keyConsumedText = i18n.t(guildId, 'heist.keyUsedText', {
                        user: keyCommitment.user.username,
                        key: kItem.name,
                        multiplier: keyMultiplier,
                    });
                }
            }

            let baseRate = target.successRate;
            let rawLoot = 0;
            let vaultDetailsText = '';
            if (target.isPoliceVault) {
                const currentTotal = db.getPoliceVault(guildId);
                if (isFullVault) {
                    baseRate = 0.05;
                    rawLoot = currentTotal;
                    vaultDetailsText = i18n.t(guildId, 'heist.jackpotText');
                } else {
                    baseRate = 0.20;
                    rawLoot = Math.floor(currentTotal * 0.20);
                    vaultDetailsText = i18n.t(guildId, 'heist.discreetInfiltrationText');
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
                    db.takeFromPoliceVault(guildId, rawLoot);
                }
                const winEmbed = new EmbedBuilder()
                    .setTitle(i18n.t(guildId, 'heist.winTitle'))
                    .setDescription(i18n.t(guildId, 'heist.winDesc', {
                        target: target.name,
                        vaultDetails: vaultDetailsText ? `${vaultDetailsText}\n\n` : '',
                        keyConsumed: keyConsumedText ? `${keyConsumedText}\n\n` : '',
                        total: i18n.formatNumber(calculatedTotalLoot, guildId),
                        multiplier: keyMultiplier > 1 ? i18n.t(guildId, 'heist.multiplierTag', { multiplier: keyMultiplier }) : '',
                        share: i18n.formatNumber(share, guildId),
                        count: team.length,
                    }))
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
                    const optItem = i18n.getItem(target.optionalItem, guildId);
                    itemLossMessages.push(i18n.t(guildId, 'heist.toolBrokeText', {
                        item: optItem.name,
                        user: toolUser.username,
                    }));
                }
                if (target.requires) {
                    db.consumeItem(interaction.user.id, target.requires);
                    const reqItem = i18n.getItem(target.requires, guildId);
                    itemLossMessages.push(i18n.t(guildId, 'heist.toolConfiscatedText', {
                        item: reqItem.name,
                    }));
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
                    const { totalSeized, takenFromStash, takenFromCash } = db.seizeFine(guildId, member.id, finePerMember);

                    if (totalSeized > 0) {
                        const protectionText = cameraReduction || guardUsed ? `, protection à ${Math.round((cameraReduction + guardReduction) * 100)} %` : '';
                        seizureMessages.push(i18n.t(guildId, 'heist.seizureLine', {
                            user: member.username,
                            amount: i18n.formatNumber(totalSeized, guildId),
                            stash: i18n.formatNumber(takenFromStash, guildId),
                            cash: i18n.formatNumber(takenFromCash, guildId),
                            protection: protectionText,
                        }));
                    } else {
                        seizureMessages.push(i18n.t(guildId, 'heist.seizureInsolvent', { user: member.username }));
                    }
                });

                const outcomes = [];
                for (const member of team) {
                    if (db.consumeItem(member.id, 'vest')) {
                        outcomes.push(i18n.t(guildId, 'heist.vestSaved', { user: member.username }));
                    } else {
                        let sentence = target.jailTime;
                        if (db.hasActiveLawyer(member.id)) {
                            sentence = Math.max(1, Math.floor(sentence / 2));
                            outcomes.push(i18n.t(guildId, 'heist.lawyerReducedSentence', { user: member.username, sentence }));
                        } else {
                            outcomes.push(i18n.t(guildId, 'heist.jailSentence', { user: member.username, sentence }));
                        }
                        db.jailPlayer(member.id, sentence);
                    }
                }

                const failEmbed = new EmbedBuilder()
                    .setTitle(i18n.t(guildId, 'heist.failTitle'))
                    .setDescription(i18n.t(guildId, 'heist.failDesc', {
                        target: target.name,
                        vaultDetails: vaultDetailsText ? `${vaultDetailsText}\n\n` : '',
                        itemLoss: itemLossMessages.length > 0 ? itemLossMessages.join('\n') + '\n\n' : '',
                        seizures: seizureMessages.join('\n'),
                        jail: outcomes.join('\n'),
                    }))
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