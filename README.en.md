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
  <a href="README.md">🇫🇷 Français</a> • <b>🇬🇧 English</b>
</p>

<p align="center">
  <b>A comprehensive and immersive Discord criminal economy bot: coordinate team heists with interactive hacking mini-games, manage secure hideouts, launder your loot, gear up on the black market, and take on the police and rival syndicates!</b>
</p>

---

## 📋 Table of Contents

- [Overview & Lore](#-overview--lore)
- [Key Features](#-key-features)
- [Slash Commands](#-slash-commands)
- [Heist Targets](#-heist-targets)
- [Black Market Catalog](#-black-market-catalog)
- [Hideouts & Real Estate](#-hideouts--real-estate)
- [Prison & Escape System](#-prison--escape-system)
- [Dedicated Channel & Anti-Spam](#-dedicated-channel--anti-spam)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Command Deployment & Startup](#-command-deployment--startup)
- [Production Deployment (PM2 & CI/CD)](#-production-deployment-pm2--cicd)
- [Project Structure](#-project-structure)
- [License](#-license)

---

## 🕶️ Overview & Lore

**Heist Bot** immerses your Discord community into the underworld of the *Syndicate*.

Every player starts with 500 $ cash in pocket and must climb the ladder of organized crime: from robbing convenience stores to executing high-stakes raids against the **Law Enforcement Vault**, or mugging fellow server members. But beware: law enforcement never sleeps, prison sentences are heavy, and hideout rent is due every week!

---

## ✨ Key Features

- 🔫 **Tactical & Co-op Heists (`/heist`)**:
  - Play solo or assemble a crew of accomplices.
  - 6 tiered targets with equipment requirements and calculated success rates.
  - **Interactive hacking mini-games** under intense countdown pressure (numeric keypad sequences).
  - Multiplier key items capable of boosting payouts up to **x20**.
  - Automatic and equitable loot distribution among all participating robbers.
- 💵 **Dual-Wallet Criminal Economy**:
  - **Cash**: readily available, but vulnerable to muggings by rival players (`/rob`).
  - **Stash**: secure and untouchable inside your hideout, subject to a **10% laundering tax** upon deposit.
- 🏚️ **Real Estate & Hideout Defenses (`/hideout`, `/buy-hideout`)**:
  - 10 hideout tiers storing up to 5,000,000 $.
  - Automated weekly rent deducted every Monday at 00:00 UTC.
  - Defenses including security cameras and armed guards to protect against burglars.
- 🚨 **Dynamic Prison & Bail System (`/escape`, `/bail`)**:
  - Incarceration on failed robberies or muggings.
  - Brute-force escape mini-game (`/escape`) to pick the cell lock.
  - Pay bail for instant release or free a jailed accomplice (`/bail`).
  - Passive safety with the **Body Armor Vest** or reduced jail times with a **Crooked Lawyer**.
- 🚓 **Server Police Vault (`/vault`)**:
  - Every arrest fine and police seizure pools into a server-wide jackpot.
  - Raid and crack the Law Enforcement Vault to claim the entire prize!
- 🛒 **Underground Black Market (`/shop`, `/buy`)**:
  - Essential gear (radio jammers, lockpick kits, thermal drills, corrupt police badges).
- 🌍 **Full Internationalization (i18n)**:
  - Native bilingual support for **French** and **English** with an admin switch command (`/language`).
- 🧹 **Clean Server Integration**:
  - Automatic creation of the `#heist-bot` text channel upon joining.
  - Strict command restriction to the dedicated channel to prevent spamming general chats.

---

## 🎮 Slash Commands

All interactions use Discord's native Slash Commands (`/`):

| Command | Arguments | Permissions | Description |
| :--- | :--- | :--- | :--- |
| `/heist` | *none* | Everyone | Prepares and launches an armed robbery (solo or crew). |
| `/profile` | `joueur` *(opt)* | Everyone | Displays criminal file, cash, stash, stats, and gear. |
| `/rob` | `cible` *(req)* | Everyone | Attempts to mug another server member's on-hand cash. |
| `/hideout` | *none* | Everyone | Displays hideout tier, capacity, security level, and rent. |
| `/buy-hideout` | *none* | Everyone | Purchases a hideout or upgrades it to the next tier. |
| `/deposit` | `montant` *(req)* | Everyone | Launders and deposits cash into your hideout (10% fee). |
| `/withdraw` | `montant` *(req)* | Everyone | Withdraws secured funds from hideout to cash wallet. |
| `/shop` | *none* | Everyone | Browses illegal gear and tools on the black market. |
| `/buy` | `item` *(req)*, `quantite` *(opt)* | Everyone | Purchases gear from the black market. |
| `/vault` | *none* | Everyone | Checks the seized jackpot in the server's Police Vault. |
| `/escape` | *none* | Inmates | Attempts a jailbreak via brute-force terminal hacking. |
| `/bail` | `cible` *(opt)* | Everyone | Pays bail to immediately release yourself or an inmate. |
| `/leaderboard` | *none* | Everyone | Displays the Top 10 wealthiest syndicate kingpins. |
| `/help` | *none* | Everyone | Displays the complete syndicate command directory. |
| `/language` | `langue` *(req: fr/en)* | **Admin** | Changes the bot display language for the server. |

---

## 🎯 Heist Targets

Each operation carries distinct risks, rewards, and gear requirements:

| Target | Base Loot | Success Rate | Jail Time | Required / Optional Gear | Hacking Mini-Game | Cooldown |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Grocery Store** | 200 $ - 600 $ | 80% | 2 min | *Crowbar* (+10% success) | None | 5 min |
| **Jewelry Store** | 800 $ - 2,000 $ | 60% | 5 min | *Bolt Cutter* (+10% success) | None | 15 min |
| **Local Bank** | 2,000 $ - 4,500 $ | 45% | 7 min | **Radio Jammer** *(required)* | Alarm Panel (4 keys / 8s) | 30 min |
| **Luxury Store** | 3,500 $ - 7,500 $ | 40% | 8 min | **Lockpick Kit** *(required)* | Smart Showcase (6 keys / 11s) | 45 min |
| **Central Bank** | 6,000 $ - 15,000 $ | 25% | 12 min | **Thermal Drill** *(required)* | Bank Mainframe (8 keys / 14s) | 60 min |
| **Police Vault** | **Full Jackpot** (`/vault`) | Variable | 15 min | **Corrupt Badge** *(required)* | Evidence Vault (10 keys / 18s) | 120 min |

---

## 🛒 Black Market Catalog

Items can be acquired via `/buy <item>` and grant crucial tactical benefits:

| ID (`item`) | Name | Price | Type | Effect |
| :--- | :--- | :--- | :--- | :--- |
| `crowbar` | **Crowbar** | 300 $ | Tool | +10% success at Grocery Store (breaks on failure). |
| `bolt_cutter` | **Bolt Cutter** | 600 $ | Tool | +10% success at Jewelry Store (breaks on failure). |
| `jammer` | **Radio Jammer** | 1,000 $ | Requirement | Required for Local Bank (destroyed on failure). |
| `lockpick_kit` | **Pro Lockpick Kit** | 1,800 $ | Requirement | Required for Luxury Store (confiscated on failure). |
| `drill` | **Thermal Drill** | 3,500 $ | Requirement | Required for Central Bank (destroyed on failure). |
| `police_badge` | **Corrupt Access Badge** | 5,000 $ | Requirement | Required for Police Vault (confiscated on failure). |
| `vest` | **Body Armor Vest** | 800 $ | Defense | Consumable: negates arrest once upon heist failure. |
| `lawyer` | **Crooked Lawyer** | 1,200 $ | Service | Active for 1h: halves all jail sentences. |
| `key_bronze` | **Bronze Key** | 1,500 $ | Multiplier | Multiplies heist payout by **x2**. |
| `key_silver` | **Silver Key** | 3,500 $ | Multiplier | Multiplies heist payout by **x3**. |
| `key_gold` | **Gold Key** | 8,000 $ | Multiplier | Multiplies heist payout by **x5**. |
| `key_diamond` | **Diamond Key** | 20,000 $ | Multiplier | Multiplies heist payout by **x10**. |
| `key_special` | **Special Key** | 12,000 $ | Multiplier | Random mystery payout multiplier (**x2, x3, x5, x10, or x20**). |

---

## 🏚️ Hideouts & Real Estate

Hideouts safeguard your criminal wealth from muggings and police searches.

| Level | Purchase / Upgrade Cost | Max Stash Capacity | Weekly Rent (Monday 00:00 UTC) |
| :---: | :---: | :---: | :---: |
| **1** | 5,000 $ | 50,000 $ | 500 $ |
| **2** | 12,000 $ | 120,000 $ | 1,200 $ |
| **3** | 25,000 $ | 250,000 $ | 2,500 $ |
| **4** | 50,000 $ | 500,000 $ | 5,000 $ |
| **5** | 100,000 $ | 1,000,000 $ | 10,000 $ |
| **6** | 150,000 $ | 1,500,000 $ | 15,000 $ |
| **7** | 200,000 $ | 2,000,000 $ | 20,000 $ |
| **8** | 300,000 $ | 3,000,000 $ | 30,000 $ |
| **9** | 400,000 $ | 4,000,000 $ | 40,000 $ |
| **10** | 500,000 $ | 5,000,000 $ | 50,000 $ |

> 💡 **Money Laundering**: Deposits (`/deposit`) deduct a 10% syndicate laundering fee.

---

## 🚨 Prison & Escape System

When an operative is arrested:
1. **Incarceration Period**: Cannot participate in heists or muggings until sentence expires.
2. **Bail (`/bail`)**: The inmate (or a generous crewmate) can pay bail scaled to remaining jail time.
3. **Jailbreak (`/escape`)**: Interactive brute-force mini-game to unlock the cell. Failing incurs a cooldown.
4. **Protective Measures**:
   - Equipping a **Body Armor Vest** absorbs the arrest (vest is consumed).
   - Retaining a **Crooked Lawyer** reduces sentence duration by 50%.

---

## 🛡️ Dedicated Channel & Anti-Spam

To keep community chat channels organized and clutter-free:
- When joining a guild, the bot automatically creates the `#heist-bot` text channel.
- **All gameplay commands** are strictly restricted to this dedicated channel.
- Executing commands elsewhere yields an ephemeral error with a direct link to `#heist-bot`.
- Only the administrative `/language` command can be executed server-wide.

---

## 📦 Prerequisites

- [Node.js](https://nodejs.org/) version **16.9.0** or higher
- [npm](https://www.npmjs.com/)
- A Discord Developer Account with an application configured on the [Discord Developer Portal](https://discord.com/developers/applications):
  - **Required Intents**: `Guilds`
  - **Bot Permissions**: *Send Messages*, *Manage Channels* (to create `#heist-bot`), *Embed Links*, *Use Slash Commands*

---

## 🚀 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AlexShadow3/heist-bot.git
   cd heist-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

---

## ⚙️ Configuration

1. Copy the configuration template `config.example.json` to `config.json`:
   ```bash
   cp config.example.json config.json
   ```

2. Populate your Discord credentials in `config.json`:
   ```json
   {
       "token": "YOUR_DISCORD_BOT_TOKEN",
       "clientId": "YOUR_DISCORD_CLIENT_ID"
   }
   ```

> ⚠️ **Security**: Never commit `config.json` or the SQLite database `data.db` to public repositories (both are included in `.gitignore`).

---

## 🎯 Command Deployment & Startup

Register slash commands with the Discord API:

```bash
npm run deploy-commands
# or: node deploy-commands.js
```

Start the bot:

```bash
npm start
# or: node main.js
```

---

## 📡 Production Deployment (PM2 & CI/CD)

### PM2 Process Manager
Run the bot persistently in the background:

```bash
npm install -g pm2
pm2 start main.js --name "heist-bot"
pm2 save
pm2 startup
```

### Automated CI/CD (GitHub Actions)
The repository includes `.github/workflows/deploy.yml` configured for a self-hosted runner (e.g., Raspberry Pi) triggering on every push to `master`:
- Pulls latest code (`git pull`).
- Installs production dependencies (`npm install --omit=dev`).
- Registers updated slash commands (`node deploy-commands.js`).
- Restarts the PM2 process (`pm2 restart heist-bot`).

---

## 📁 Project Structure

```text
heist-bot/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions PM2 deployment pipeline
├── commands/
│   └── utility/                # Slash command handlers
│       ├── bail.js             # Bail payment
│       ├── buy.js              # Black market shopping
│       ├── buy-hideout.js      # Hideout purchase & upgrades
│       ├── deposit.js          # Cash deposit & laundering
│       ├── escape.js           # Jailbreak attempt
│       ├── heist.js            # Main heist engine & hacking games
│       ├── help.js             # Command directory
│       ├── hideout.js          # Hideout management & stats
│       ├── language.js         # Language configuration (Admin)
│       ├── leaderboard.js      # Wealth leaderboards
│       ├── profile.js          # Criminal file & inventory
│       ├── rob.js              # PvP mugging
│       ├── shop.js             # Black market catalog
│       ├── vault.js            # Law enforcement vault
│       └── withdraw.js         # Stash withdrawal
├── events/
│   ├── guildCreate.js          # Automatic #heist-bot channel creation
│   ├── interactionCreate.js    # Channel restriction & command routing
│   └── ready.js                # Bot initialization & logging
├── locales/                    # Translation files
│   ├── en.js                   # English locale
│   └── fr.js                   # French locale
├── config.example.json         # Configuration template
├── config.json                 # Private credentials (git-ignored)
├── data.db                     # Persistent SQLite local database
├── database.js                 # Data access layer (better-sqlite3)
├── deploy-commands.js          # Discord slash command registration
├── i18n.js                     # Internationalization engine
├── items.js                    # Black market item catalog & prices
├── main.js                     # Main bot entry point
├── package.json                # Project manifest & npm scripts
├── LICENSE                     # ISC License
├── README.md                   # Documentation (French)
└── README.en.md                # Documentation (English)
```

---

## 📜 License

This project is licensed under the **ISC License**. See the [LICENSE](file:///c:/Users/compt/Documents/Github/AlexShadow3/heist-bot/LICENSE) file for details.
