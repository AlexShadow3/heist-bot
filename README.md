# 💰 Heist Bot

<p align="center">
  <img src="https://img.shields.io/badge/Discord.js-v14.27-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js v14" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D16.9.0-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/SQLite-Better--SQLite3-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/PM2-Daemon-2B037A?style=for-the-badge&logo=pm2&logoColor=white" alt="PM2" />
  <img src="https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="CI/CD" />
  <img src="https://img.shields.io/badge/i18n-FR%20%7C%20EN-blueviolet?style=for-the-badge" alt="Multilingual FR/EN" />
  <img src="https://img.shields.io/badge/License-ISC-blue?style=for-the-badge" alt="License ISC" />
</p>

<p align="center">
  <b>🇫🇷 Français</b> • <a href="README.en.md">🇬🇧 English</a>
</p>

<p align="center">
  <b>Un bot Discord d'économie criminelle complet et immersif : planifiez des braquages coopératifs avec mini-jeux de hacking, gérez vos planques secrètes, blanchissez votre butin, équipez-vous au marché noir et défiez la police ainsi que vos rivaux !</b>
</p>

---

## 📋 Sommaire

- [Aperçu & Univers](#-aperçu--univers)
- [Fonctionnalités Clés](#-fonctionnalités-clés)
- [Commandes Slash](#-commandes-slash)
- [Cibles de Braquage](#-cibles-de-braquage)
- [Catalogue du Marché Noir](#-catalogue-du-marché-noir)
- [Planques & Système Immobilier](#-planques--système-immobilier)
- [Système Pénitentiaire & Évasion](#-système-pénitentiaire--évasion)
- [Salon Dédié & Anti-Spam](#-salon-dédié--anti-spam)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Déploiement des Commandes & Lancement](#-déploiement-des-commandes--lancement)
- [Déploiement en Production (PM2 & CI/CD)](#-déploiement-en-production-pm2--cicd)
- [Structure du Projet](#-structure-du-projet)
- [Licence](#-licence)

---

## 🕶️ Aperçu & Univers

**Heist Bot** plonge les membres de votre serveur Discord au cœur de la pègre urbaine du *Syndicat*. 

Chaque joueur démarre avec une liasse de 500 $ en poche et doit gravir les échelons du crime organisé : du simple vol d'épicerie jusqu'au raid à haut risque sur le **Coffre des forces de l'ordre**, en passant par le cambriolage d'autres membres du serveur. Mais attention : la police veille, les peines de prison tombent vite et les loyers de vos planques se paient chaque semaine !

---

## ✨ Fonctionnalités Clés

- 🔫 **Braquages Stratégiques & Coopératifs (`/heist`)** :
  - Jouez en solo ou rassemblez une équipe de complices.
  - 6 cibles progressives avec prérequis matériels et probabilités calculées.
  - **Mini-jeux de hacking interactifs** sous haute pression (séquences chiffrées chronométrées).
  - Clés multiplicatrices de butin pouvant multiplier vos gains jusqu'à **x20**.
  - Répartition automatique et équitable des gains entre tous les participants.
- 💵 **Économie Criminelle à Double Portefeuille** :
  - **Argent liquide (Cash)** : utilisable immédiatement, mais vulnérable aux agressions des autres joueurs (`/rob`).
  - **Planque (Stash)** : coffre sécurisé et inviolable sous réserve de payer la **taxe de blanchiment de 10 %** au dépôt.
- 🏚️ **Gestion Immobilière & Défenses (`/hideout`, `/buy-hideout`)** :
  - 10 niveaux de planques permettant de stocker jusqu'à 5 000 000 $.
  - Loyer hebdomadaire automatique déduit chaque lundi à 00:00 UTC.
  - Améliorations de sécurité (caméras de surveillance et gardes armés).
- 🚨 **Système Pénitentiaire Vivant (`/escape`, `/bail`)** :
  - Arrestation en cas d'échec de braquage ou de vol à main armée.
  - Tentative d'évasion via un terminal de bruteforce interactif (`/escape`).
  - Paiement d'une caution pour recouvrer sa liberté ou libérer un allié (`/bail`).
  - Protection passive via le **Gilet pare-balles** ou réduction de peine via l'**Avocat véreux**.
- 🚓 **Le Coffre Public des Forces de l'Ordre (`/vault`)** :
  - Chaque arrestation et saisie alimente une cagnotte publique propre au serveur.
  - Ce coffre peut être pillé lors du braquage de niveau Ultime !
- 🛒 **Marché Noir Clandestin (`/shop`, `/buy`)** :
  - Équipements essentiels (brouilleurs, kits de crochetage, perceuses thermiques, faux badges).
- 🌍 **Internationalisation Complète (i18n)** :
  - Prise en charge native du **Français** et de l'**Anglais** avec bascule par commande administrateur (`/language`).
- 🧹 **Organisation Propre du Serveur** :
  - Création automatique du salon `#heist-bot` à l'invitation.
  - Restriction stricte des commandes au salon dédié pour préserver les canaux généraux.

---

## 🎮 Commandes Slash

Toutes les commandes s'exécutent via l'interface de commandes slash de Discord (`/`) :

| Commande | Arguments | Permission | Description |
| :--- | :--- | :--- | :--- |
| `/heist` | *aucun* | Tous | Prépare et lance un braquage tactique (solo ou équipe). |
| `/profile` | `joueur` *(opt)* | Tous | Affiche la fiche criminelle, finances, réputation et équipement. |
| `/rob` | `cible` *(req)* | Tous | Tente de dérober l'argent liquide d'un autre membre du serveur. |
| `/hideout` | *aucun* | Tous | Affiche le statut, la capacité, la sécurité et le loyer de sa planque. |
| `/buy-hideout` | *aucun* | Tous | Achète une première planque ou l'améliore au niveau supérieur. |
| `/deposit` | `montant` *(req)* | Tous | Blanchit et dépose du cash dans sa planque (frais : 10 %). |
| `/withdraw` | `montant` *(req)* | Tous | Retire des fonds sécurisés de sa planque vers son portefeuille. |
| `/shop` | *aucun* | Tous | Ouvre le catalogue d'équipements illégaux du marché noir. |
| `/buy` | `item` *(req)*, `quantite` *(opt)* | Tous | Achète un ou plusieurs objets du marché noir. |
| `/vault` | *aucun* | Tous | Consulte la cagnotte accumulée dans le Coffre de la police. |
| `/escape` | *aucun* | Tous (prisonniers) | Tente une évasion de prison via le mini-jeu de décryptage. |
| `/bail` | `cible` *(opt)* | Tous | Règle une caution pour se libérer ou libérer un complice écroué. |
| `/leaderboard` | *aucun* | Tous | Affiche le Top 10 des plus grandes fortunes criminelles du serveur. |
| `/help` | *aucun* | Tous | Présente le sommaire et le fonctionnement des commandes. |
| `/language` | `langue` *(req : fr/en)* | **Admin** | Définit la langue d'affichage du bot pour le serveur (utilisable partout). |

---

## 🎯 Cibles de Braquage

Chaque opération comporte des risques et nécessite une préparation adéquate :

| Cible | Butin de base | Taux de succès | Durée prison | Équipement requis / optionnel | Mini-jeu de Hacking | Cooldown |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Épicerie** | 200 $ - 600 $ | 80 % | 2 min | *Pied-de-biche* (+10 % succès) | Aucun | 5 min |
| **Bijouterie de quartier** | 800 $ - 2 000 $ | 60 % | 5 min | *Coupe-boulon* (+10 % succès) | Aucun | 15 min |
| **Banque de quartier** | 2 000 $ - 4 500 $ | 45 % | 7 min | **Brouilleur radio** *(requis)* | Boîtier d'alarme (4 touches / 8s) | 30 min |
| **Magasin de luxe** | 3 500 $ - 7 500 $ | 40 % | 8 min | **Kit de crochetage** *(requis)* | Vitrines connectées (6 touches / 11s) | 45 min |
| **Banque centrale** | 6 000 $ - 15 000 $ | 25 % | 12 min | **Perceuse thermique** *(requis)* | Mainframe bancaire (8 touches / 14s) | 60 min |
| **Coffre des forces de l'ordre** | **Total cagnotte** (`/vault`) | Variable | 15 min | **Badge corrompu** *(requis)* | Salle des scellés (10 touches / 18s) | 120 min |

---

## 🛒 Catalogue du Marché Noir

Les objets s'achètent via `/buy <item>` et procurent des avantages décisifs :

| Identifiant (`item`) | Nom | Prix | Type | Effet |
| :--- | :--- | :--- | :--- | :--- |
| `crowbar` | **Pied-de-biche** | 300 $ | Outil | +10 % de chance à l'Épicerie (se brise en cas d'échec). |
| `bolt_cutter` | **Coupe-boulon** | 600 $ | Outil | +10 % de chance à la Bijouterie (se brise en cas d'échec). |
| `jammer` | **Brouilleur radio** | 1 000 $ | Prérequis | Obligatoire pour la Banque de quartier (détruit si échec). |
| `lockpick_kit` | **Kit de crochetage pro** | 1 800 $ | Prérequis | Obligatoire pour le Magasin de luxe (confisqué si échec). |
| `drill` | **Perceuse thermique** | 3 500 $ | Prérequis | Obligatoire pour la Banque centrale (détruite si échec). |
| `police_badge` | **Badge corrompu** | 5 000 $ | Prérequis | Obligatoire pour infiltrer le Coffre de police (confisqué si échec). |
| `vest` | **Gilet pare-balles** | 800 $ | Protection | Consommable : annule l'incarcération lors d'un échec. |
| `lawyer` | **Avocat véreux** | 1 200 $ | Service | Valable 1h : divise par 2 la durée de toutes vos peines de prison. |
| `key_bronze` | **Clé en bronze** | 1 500 $ | Butin | Multiplie par **x2** les gains du casse. |
| `key_silver` | **Clé en argent** | 3 500 $ | Butin | Multiplie par **x3** les gains du casse. |
| `key_gold` | **Clé en or** | 8 000 $ | Butin | Multiplie par **x5** les gains du casse. |
| `key_diamond` | **Clé en diamant** | 20 000 $ | Butin | Multiplie par **x10** les gains du casse. |
| `key_special` | **Clé spéciale** | 12 000 $ | Butin | Multiplicateur mystère aléatoire (**x2, x3, x5, x10 ou x20**). |

---

## 🏚️ Planques & Système Immobilier

Les planques protègent vos fonds contre les braqueurs et les fouilles policières.

| Niveau | Prix d'achat / Amélioration | Capacité max de stockage | Loyer hebdomadaire (Lundi 00h00 UTC) |
| :---: | :---: | :---: | :---: |
| **1** | 5 000 $ | 50 000 $ | 500 $ |
| **2** | 12 000 $ | 120 000 $ | 1 200 $ |
| **3** | 25 000 $ | 250 000 $ | 2 500 $ |
| **4** | 50 000 $ | 500 000 $ | 5 000 $ |
| **5** | 100 000 $ | 1 000 000 $ | 10 000 $ |
| **6** | 150 000 $ | 1 500 000 $ | 15 000 $ |
| **7** | 200 000 $ | 2 000 000 $ | 20 000 $ |
| **8** | 300 000 $ | 3 000 000 $ | 30 000 $ |
| **9** | 400 000 $ | 4 000 000 $ | 40 000 $ |
| **10** | 500 000 $ | 5 000 000 $ | 50 000 $ |

> 💡 **Blanchiment** : Tout dépôt (`/deposit`) applique une commission de 10 % correspondant aux frais de blanchiment du Syndicat.

---

## 🚨 Système Pénitentiaire & Évasion

Lorsqu'un joueur est écroué :
1. **Période d'incarcération** : il ne peut participer à aucun braquage ni commettre de vol jusqu'à expiration de la peine.
2. **Caution (`/bail`)** : le joueur (ou un complice généreux) peut payer une caution proportionnelle au temps restant pour une libération immédiate.
3. **Évasion (`/escape`)** : mini-jeu interactif permettant de crocheter la cellule. En cas d'échec, un délai d'attente s'applique avant la prochaine tentative.
4. **Atténuation préventive** :
   - Équiper un **Gilet pare-balles** absorbe l'arrestation (le gilet est consommé).
   - Recruter un **Avocat véreux** réduit automatiquement de 50 % la durée de détention.

---

## 🛡️ Salon Dédié & Anti-Spam

Pour éviter d'encombrer les salons de discussion communautaires :
- Dès son ajout au serveur, le bot crée automatiquement le salon textuel `#heist-bot`.
- **Toutes les commandes de jeu** sont strictement limitées à ce salon.
- Si un joueur lance une commande ailleurs, le bot lui répond par un message éphémère contenant un raccourci cliquable vers `#heist-bot`.
- Seule la commande administrative `/language` peut être exécutée dans n'importe quel salon.

---

## 📦 Prérequis

- [Node.js](https://nodejs.org/) version **16.9.0** ou supérieure
- [npm](https://www.npmjs.com/)
- Un compte et une application sur le [Portail Développeur Discord](https://discord.com/developers/applications) :
  - **Intents requis** : `Guilds`
  - **Autorisations du bot** : *Send Messages*, *Manage Channels* (pour la création du salon `#heist-bot`), *Embed Links*, *Use Slash Commands*

---

## 🚀 Installation

1. **Cloner le dépôt :**
   ```bash
   git clone https://github.com/AlexShadow3/heist-bot.git
   cd heist-bot
   ```

2. **Installer les dépendances :**
   ```bash
   npm install
   ```

---

## ⚙️ Configuration

1. Copiez le fichier modèle `config.example.json` vers `config.json` :
   ```bash
   cp config.example.json config.json
   ```

2. Renseignez vos identifiants d'application Discord dans `config.json` :
   ```json
   {
       "token": "VOTRE_TOKEN_DE_BOT_DISCORD",
       "clientId": "VOTRE_CLIENT_ID_DISCORD"
   }
   ```

> ⚠️ **Sécurité** : Ne commitez jamais votre `config.json` ni votre base de données locale `data.db` sur un dépôt public (ils sont protégés par le `.gitignore`).

---

## 🎯 Déploiement des Commandes & Lancement

Enregistrez les commandes auprès de l'API Discord :

```bash
npm run deploy-commands
# ou: node deploy-commands.js
```

Lancez ensuite le bot :

```bash
npm start
# ou: node main.js
```

---

## 📡 Déploiement en Production (PM2 & CI/CD)

### Gestionnaire de Processus PM2
Pour exécuter le bot en continu 24h/24 :

```bash
npm install -g pm2
pm2 start main.js --name "heist-bot"
pm2 save
pm2 startup
```

### Déploiement Continu Automatisé (GitHub Actions)
Le workflow `.github/workflows/deploy.yml` assure la mise à jour sans interruption sur un runner self-hosted (ex : Raspberry Pi) lors de chaque `push` sur la branche `master` :
- Récupération du code (`git pull`).
- Installation des dépendances de production (`npm install --omit=dev`).
- Déploiement automatique des nouvelles commandes (`node deploy-commands.js`).
- Redémarrage à chaud de l'instance PM2 (`pm2 restart heist-bot`).

---

## 📁 Structure du Projet

```text
heist-bot/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Pipeline de déploiement continu PM2
├── commands/
│   └── utility/                # Logique des commandes Slash
│       ├── bail.js             # Paiement de caution
│       ├── buy.js              # Achat au marché noir
│       ├── buy-hideout.js      # Acquisition/amélioration de planque
│       ├── deposit.js          # Dépôt & blanchiment d'argent
│       ├── escape.js           # Tentative d'évasion
│       ├── heist.js            # Moteur principal des braquages & hacks
│       ├── help.js             # Sommaire d'aide
│       ├── hideout.js          # Gestion & statut de la planque
│       ├── language.js         # Configuration de la langue (Admin)
│       ├── leaderboard.js      # Classement des fortunes
│       ├── profile.js          # Profil criminel & inventaire
│       ├── rob.js              # Vol entre joueurs (PvP)
│       ├── shop.js             # Catalogue du marché noir
│       ├── vault.js            # Coffre public des forces de l'ordre
│       └── withdraw.js         # Retrait d'argent sécurisé
├── events/
│   ├── guildCreate.js          # Création automatique du salon #heist-bot
│   ├── interactionCreate.js    # Filtrage par salon et routage des commandes
│   └── ready.js                # Initialisation et journalisation du bot
├── locales/                    # Fichiers de traduction
│   ├── en.js                   # Traductions en anglais
│   └── fr.js                   # Traductions en français
├── config.example.json         # Modèle de configuration
├── config.json                 # Clés privées (ignoré par git)
├── data.db                     # Base de données SQLite locale persistante
├── database.js                 # Couche d'accès aux données (better-sqlite3)
├── deploy-commands.js          # Script de déploiement des Slash Commands
├── i18n.js                     # Moteur d'internationalisation
├── items.js                    # Base de référence des objets et prix
├── main.js                     # Point d'entrée de l'application
├── package.json                # Manifeste et dépendances npm
├── LICENSE                     # Licence légale du projet
├── README.md                   # Documentation officielle (Français)
└── README.en.md                # Documentation officielle (Anglais)
```

---

## 📜 Licence

Ce projet est distribué sous licence **ISC**. Reportez-vous au fichier [LICENSE](file:///c:/Users/compt/Documents/Github/AlexShadow3/heist-bot/LICENSE) pour plus d'informations.
