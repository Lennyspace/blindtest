# Blindtest Multijoueur — Vision Projet

## Concept

Site web de blind test musical multijoueur en temps réel. Un joueur crée une partie et partage un code court aux autres. Les joueurs rejoignent via ce code et jouent ensemble en simultané.

## Source musicale : YouTube (choix retenu)

**Pourquoi YouTube :**
- Catalogue illimité, gratuit, aucune authentification requise
- Les utilisateurs peuvent coller l'URL de n'importe quelle playlist YouTube publique
- API YouTube IFrame Player bien documentée et stable
- La vidéo est masquée — seul l'audio est diffusé (blind test authentique)
- Spotify a supprimé les previews 30s dans la plupart des régions (2024)
- Deezer a des problèmes CORS nécessitant un proxy complexe

**Fonctionnement :**
- Le host colle l'URL d'une playlist YouTube (ou choisit un thème prédéfini)
- Le backend extrait la liste des vidéos via YouTube Data API v3
- Chaque manche joue 30s d'une chanson (position aléatoire), vidéo cachée

## Architecture technique

```
Frontend (React + Vite)
  └── Socket.io client — temps réel
  └── YouTube IFrame API — lecture audio

Backend (Node.js + Express)
  └── Socket.io server — gestion des parties
  └── YouTube Data API v3 — récupération playlists
  └── Logique de jeu en mémoire (pas de DB)
```

## Flux de jeu

1. Host crée une partie → reçoit un code à 6 caractères
2. Joueurs rejoignent avec le code + pseudonyme
3. Host choisit une playlist (URL YouTube ou thème prédéfini)
4. Host démarre → le serveur orchestre les manches
5. Chaque manche : audio joue 30s, les joueurs tapent leur réponse
6. Fin du temps ou quand tout le monde a répondu → révélation + points
7. Leaderboard entre chaque manche

## Système de points

| Bonne réponse | Points |
|---|---|
| Artiste correct | 500 pts |
| Titre correct | 500 pts |
| Les deux | 1000 pts + bonus vitesse |
| Partiel (ex: artiste seulement) | 500 pts |

**Bonus vitesse** : 1er à trouver les deux → +200 pts, 2ème → +100 pts

## Matching des réponses (fuzzy)

Pour éviter la frustration des fautes de frappe / variantes :

- Normalisation : minuscules, suppression accents (é→e, ç→c...), trim
- Suppression des mots parasites : `the`, `les`, `la`, `l'`, `feat`, `ft`, `&`
- Aliases courants : `maitre gims` ↔ `gims`, `iam` ↔ `i am`, etc.
- Distance de Levenshtein ≤ 2 pour les chaînes longues (> 5 chars)
- Correspondance partielle si la réponse contient le mot clé principal

**Exemples acceptés :**
- "GIMS" → "Maître Gims" ✓
- "Beyoncee" → "Beyoncé" ✓
- "Starboy" → "The Starboy" ✓
- "MJ" → "Michael Jackson" ✗ (trop court/ambigu)

## Thèmes prédéfinis (playlists YouTube curées)

| Thème | Description |
|---|---|
| 🇫🇷 Hits français 2000-2010 | Variété française des années 2000 |
| 🎤 Hip-hop FR | SCH, PNL, Nekfeu, Booba, Jul... |
| 🕺 Années 80 | Classics pop/rock 80s |
| 🎸 Rock classique | Queen, AC/DC, Nirvana, U2... |
| 🎬 Bandes originales | OST films et séries |
| 💃 Club / Dance | Hits électro et dance |
| 🌍 Hits internationaux | Pop mondiale top charts |
| 🎮 Musiques de jeux vidéo | OST gaming |

Chaque thème = URL d'une playlist YouTube publique maintenue.

## Design : sobre et élégant

- Palette sombre (dark mode par défaut) avec accent couleur vive (violet ou vert néon)
- Typographie claire, grands caractères pour le timer et les scores
- Animations minimales mais soignées (timer circulaire, reveal de la réponse)
- Mobile-first — joueurs sur téléphone, host sur desktop
- Pas de fioritures : l'interface s'efface devant le jeu

## Structure des fichiers (cible)

```
blindtest/
├── client/              # React + Vite frontend
│   ├── src/
│   │   ├── pages/       # Home, Lobby, Game, Results
│   │   ├── components/  # Timer, Scoreboard, AnswerInput...
│   │   └── socket.js    # Socket.io client
├── server/              # Node.js backend
│   ├── game/            # Logique de partie (Room, Player, Round)
│   ├── youtube.js       # Wrapper YouTube Data API
│   └── index.js         # Express + Socket.io
└── CLAUDE.md
```

## Variables d'environnement nécessaires

```
YOUTUBE_API_KEY=     # YouTube Data API v3 key (Google Cloud Console, gratuit)
PORT=3001
CLIENT_URL=http://localhost:5173
```

## Ce qui n'est PAS prévu (pour rester simple)

- Pas de compte utilisateur / authentification
- Pas de base de données persistante
- Pas de chat en jeu (sauf peut-être un emoji rapide)
- Pas de mode spectateur dans un premier temps
- Pas de playlists Spotify/Deezer (choix arrêté : YouTube uniquement)
