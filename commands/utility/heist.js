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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('heist')
        .setDescription('Organise un braquage en équipe.'),
    async execute(interaction) {
        const leader = db.getPlayer(interaction.user.id);
        if (db.isJailed(leader)) {
            const remaining = Math.ceil((leader.jailedUntil - Date.now()) / 60000);
            return interaction.reply({
                content: `Tu es en cellule pour encore ${remaining} minute(s). Impossible de braquer.`,
                ephemeral: true,
            });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_target')
            .setPlaceholder('Choisis la cible du braquage')
            .addOptions([
                { label: 'Épicerie', description: 'Faible butin, peu de risques (80% succès)', value: 'epicerie' },
                { label: 'Bijouterie', description: 'Bon butin, risque moyen (55% succès)', value: 'bijouterie' },
                { label: 'Banque centrale (Perceuse requise)', description: 'Gros jackpot, haut risque (30% succès)', value: 'banque' },
            ]);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        const initialMsg = await interaction.reply({
            content: 'Choisis une cible :',
            components: [selectRow],
            fetchReply: true,
        });

        let selectedKey = null;
        try {
            const selectInteraction = await initialMsg.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id,
                componentType: ComponentType.StringSelect,
                time: 30_000,
            });
            selectedKey = selectInteraction.values[0];
            await selectInteraction.deferUpdate();
        } catch {
            return interaction.editReply({ content: 'Temps écoulé, plan annulé.', components: [] });
        }

        const target = TARGETS[selectedKey];

        // Vérification de l'équipement requis pour le leader
        if (target.requires && db.getItemQuantity(interaction.user.id, target.requires) < 1) {
            return interaction.editReply({
                content: `❌ Tu n'as pas l'équipement nécessaire (${target.requires}) pour braquer cette cible ! Passe par le \`/shop\`.`,
                components: [],
            });
        }

        const team = [interaction.user];

        const joinBtn = new ButtonBuilder()
            .setCustomId('join_heist')
            .setLabel("Rejoindre l'équipe")
            .setStyle(ButtonStyle.Success);

        const lobbyRow = new ActionRowBuilder().addComponents(joinBtn);

        const renderLobby = () => new EmbedBuilder()
            .setTitle(`Braquage préparé : ${target.name}`)
            .setDescription(`Leader : ${interaction.user}\n\n**Équipe (${team.length}) :**\n${team.map(u => `• ${u.username}`).join('\n')}`)
            .setColor(0xFEE75C)
            .setFooter({ text: 'Départ dans 30 secondes...' });

        const lobbyMsg = await interaction.editReply({
            content: 'Rassemblement de l\'équipe. Cliquez sur le bouton pour participer.',
            embeds: [renderLobby()],
            components: [lobbyRow],
        });

        const collector = lobbyMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30_000,
        });

        collector.on('collect', async btnInteraction => {
            const p = db.getPlayer(btnInteraction.user.id);
            if (db.isJailed(p)) {
                return btnInteraction.reply({ content: 'Tu es en cellule, tu ne peux pas participer.', ephemeral: true });
            }
            if (team.some(u => u.id === btnInteraction.user.id)) {
                return btnInteraction.reply({ content: 'Tu es déjà dans l\'équipe.', ephemeral: true });
            }

            team.push(btnInteraction.user);
            await btnInteraction.reply({ content: 'Tu as rejoint l\'équipe.', ephemeral: true });
            await interaction.editReply({ embeds: [renderLobby()] });
        });

        collector.on('end', async () => {
            // Bonus d'équipe (+5% par membre supplémentaire, max +20%)
            const teamBonus = Math.min((team.length - 1) * 0.05, 0.20);

            // Bonus équipement : pied-de-biche sur l'épicerie (+10% si au moins un membre en a un)
            let itemBonus = 0;
            if (selectedKey === 'epicerie' && team.some(m => db.getItemQuantity(m.id, 'crowbar') > 0)) {
                itemBonus += 0.10;
            }

            const totalSuccessRate = Math.min(target.successRate + teamBonus + itemBonus, 0.95);
            const roll = Math.random();

            if (roll <= totalSuccessRate) {
                const totalLoot = Math.floor(Math.random() * (target.loot[1] - target.loot[0] + 1)) + target.loot[0];
                const share = Math.floor(totalLoot / team.length);
                team.forEach(m => db.addCash(m.id, share));

                const winEmbed = new EmbedBuilder()
                    .setTitle('Braquage réussi !')
                    .setDescription(`L'équipe a dévalisé : **${target.name}** !\n\nButin total : **${totalLoot} $**\nPart individuelle : **${share} $** (${team.length} membres)`)
                    .setColor(0x57F287);

                await interaction.editReply({ content: null, embeds: [winEmbed], components: [] });
            } else {
                const outcomes = [];

                for (const member of team) {
                    // Si le joueur possède un gilet pare-balles, il est consommé et il esquive la prison
                    if (db.consumeItem(member.id, 'vest')) {
                        outcomes.push(`🛡️ **${member.username}** a esquivé la prison grâce à son gilet pare-balles (consommé) !`);
                    } else {
                        let sentence = target.jailTime;
                        // Si le joueur a un avocat véreux, peine divisée par deux
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
                    .setTitle('Échec du braquage !')
                    .setDescription(`La police a encerclé la zone à : **${target.name}** !\n\n${outcomes.join('\n')}`)
                    .setColor(0xED4245);

                await interaction.editReply({ content: null, embeds: [failEmbed], components: [] });
            }
        });
    },
};