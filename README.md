# 💰 Heist Bot

**Heist Bot** est un bot Discord interactif basé sur un système d'économie criminelle. Frayez-vous un chemin vers le sommet en réalisant des braquages, en volant d'autres joueurs, en achetant des planques et en évitant la prison !

## ✨ Fonctionnalités

- **Système d'Économie Complet :** Gérez votre argent liquide et sécurisez vos fonds dans un coffre-fort (Vault).
- **Braquages & Vols :** Organisez des braquages ou volez directement les autres utilisateurs.
- **Boutique & Planques :** Achetez des objets dans la boutique et investissez dans des planques (Hideouts) pour améliorer vos statistiques.
- **Système de Prison :** Vous vous êtes fait attraper ? Tentez de vous évader ou payez votre caution.
- **Classements :** Mesurez-vous aux autres joueurs grâce au classement global.

## 🛠️ Commandes Disponibles

Toutes les commandes utilisent les *Slash Commands* de Discord (`/`).

### 💸 Économie & Banque
- `/profile` : Affiche vos statistiques, votre argent et votre statut actuel.
- `/deposit` : Dépose de l'argent de votre portefeuille vers votre coffre-fort.
- `/withdraw` : Retire de l'argent de votre coffre-fort.
- `/vault` : Consulte le solde de votre coffre-fort.
- `/leaderboard` : Affiche le classement des joueurs les plus riches.

### 🔫 Crime & Action
- `/heist` : Lance un braquage (attention aux risques !).
- `/rob` : Tente de voler de l'argent à un autre utilisateur.

### 🛒 Boutique & Immobilier
- `/shop` : Affiche les objets disponibles à l'achat.
- `/buy` : Achète un objet spécifique dans la boutique.
- `/hideout` : Gère ou affiche les informations de votre planque actuelle.
- `/buy-hideout` : Achète une nouvelle planque.

### 🚨 Prison
- `/escape` : Tente une évasion de prison.
- `/bail` : Paie la caution pour sortir de prison immédiatement.

### ℹ️ Utilitaire
- `/help` : Affiche la liste complète des commandes et leur fonctionnement.

## 🚀 Installation & Lancement

### Prérequis
- [Node.js](https://nodejs.org/) (version 16.9.0 ou supérieure recommandée)
- Un compte développeur Discord et un [Token de Bot Discord](https://discord.com/developers/applications)

### Étapes d'installation

1. **Cloner le dépôt :**
   ```bash
   git clone <url-de-ton-repo>
   cd heist-bot
   ```

2. **Installer les dépendances :**
   ```bash
   npm install
   ```

3. **Configuration :**
   Créez un fichier `.env` à la racine du projet et ajoutez-y vos informations d'identification Discord et de base de données :
   ```env
   DISCORD_TOKEN=votre_token_discord_ici
   CLIENT_ID=votre_id_client_discord
   # Ajoute d'autres variables si nécessaire (ex: URI de base de données)
   ```

4. **Déployer les commandes (Slash Commands) :**
   Avant de lancer le bot, vous devez enregistrer les commandes auprès de l'API Discord :
   ```bash
   node deploy-commands.js
   ```

5. **Lancer le bot :**
   ```bash
   node main.js
   ```

## 🏗️ Structure du Projet

- `main.js` : Point d'entrée principal du bot.
- `deploy-commands.js` : Script pour enregistrer/actualiser les commandes slash.
- `database.js` : Gestion des connexions et des requêtes à la base de données.
- `items.js` : Configuration des objets disponibles en jeu.
- `commands/` : Contient la logique de chaque commande (divisé en sous-dossiers comme `utility/`).
- `events/` : Gestionnaires d'événements Discord (ex: `ready.js`, `interactionCreate.js`, `guildCreate.js`).
- `.github/workflows/` : Configurations pour le déploiement continu et les actions GitHub.

## 📄 Licence

Ce projet est sous licence. Veuillez consulter le fichier `LICENSE` pour plus de détails.