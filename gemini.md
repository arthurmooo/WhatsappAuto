# 🧠 Gemini Context - WhatsApp Medical Bot

Ce fichier récapitule tout le contexte, les règles critiques et l'architecture du projet pour tout agent travaillant sur ce dossier.

## 📋 Vue d'ensemble
Ce projet est un **bot WhatsApp pour secrétariat médical** (simulant un "Dr. Mô"). Il permet aux patients de prendre, modifier et annuler des rendez-vous via une conversation naturelle.
- **Backend**: Node.js + TypeScript
- **IA**: OpenAI (GPT-4o / GPT-4o-mini)
- **Calendrier**: API Cal.com
- **Interface**: WhatsApp (via Twilio ou similaire - le code utilise des webhooks)

## 🛠 Architecture Clé

### 1. `src/agent/bot.ts` (Cerveau)
Contient la logique principale de l'agent.
- **System Prompt**: Très détaillé, inclut un calendrier dynamique de 14 jours.
- **Tools**:
    - `checkAvailability`: Vérifie les slots Cal.com.
    - `createBooking`: Crée un RDV.
    - `cancelBooking`: Annule un RDV.
    - `getBookings`: Récupère les RDV actifs.
- **Validation Critique**: Contient la fonction `validateDayDateInMessage(message)` qui intercepte les erreurs de date (ex: "mardi 8 janvier" alors que le 8 est un jeudi) AVANT l'appel à l'IA.

### 2. `src/services/calcom.ts` (Bras)
Gère les interactions avec l'API Cal.com.
- **Timezones**: Tout est géré en `Europe/Paris`.
- **Méthodes**:
    - `getBookings()`: Convertit les heures UTC de l'API en heure locale pour l'affichage (ex: 12:00 UTC+1 s'affiche bien 12:00, pas 11:00).
    - `cancelBooking()`: Gère gracieusement les erreurs "already cancelled".

### 3. `src/test_console.ts` (Outil de Test)
Permet de tester le bot sans WhatsApp via terminal (`npm run console`).

## 🚨 Règles CRITIQUES (Do Not Touch / Must Follow)

### 💾 1. Gestion des IDs de Réservation
**Règle d'Or**: L'IA ne doit **JAMAIS** inventer un ID de réservation (comme "1", "2").
- Pour annuler/modifier, l'IA doit **TOUJOURS** appeler `getBookings` d'abord.
- Elle doit utiliser l'ID numérique exact retourné par `getBookings` (ex: `14209729`).
- Le prompt système et la description des tools interdisent explicitement les IDs inventés.

### 📅 2. Hallucinations de Dates
**Règle d'Or**: L'IA ne doit pas accepter une combinaison jour/date invalide.
- Une validation **hard-codée** (`validateDayDateInMessage`) scanne chaque message utilisateur.
- Si l'utilisateur dit "mardi 8 janvier" (et que le 8 est un jeudi), le code rejette le message et demande confirmation, sans passer par l'IA.

### ⏰ 3. Timezones
**Règle d'Or**: Tout est affiché en heure de Paris.
- L'API Cal.com stocke en UTC.
- `getBookings` reformate explicitement en `Europe/Paris` avant de renvoyer les infos à l'IA.
- Si ce n'est pas fait, un RDV à midi apparaîtra comme 11h (l'hiver) ou 10h (l'été).

### 🤖 4. Comportement Proactif
**Règle d'Or**: Le bot doit agir comme une secrétaire efficace.
- Si le patient dit "la semaine prochaine", le bot appelle `checkAvailability` **immédiatement**.
- Il ne demande **jamais** "quelle heure voulez-vous ?" avant d'avoir vérifié les dispos.
- Il propose toujours 3-5 créneaux.

## 🐛 Bugs Récents & Résolus
1.  **Date Mismatch**: Fixé par validation code-level (regex).
2.  **Timezone Display**: Fixé par conversion `date-fns-tz` dans `getBookings`.
3.  **BookingId Hallucination**: Fixé par instruction stricte dans le système prompt + description des tools.
4.  **Infinite Cancel Loop**: Fixé en filtrant les bookings déjà annulés dans `getBookings`.

## 🚀 Commandes Utiles
- **Lancer le test console**: `npm run console` (Le moyen le plus rapide de vérifier la logique)
- **Lancer le serveur**: `npm run dev`
