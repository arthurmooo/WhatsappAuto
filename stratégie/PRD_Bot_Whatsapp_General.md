# Product Requirements Document (PRD): Assistant Médical WhatsApp (Dr. Mô)

## 1. Introduction
Ce document décrit les spécifications fonctionnelles et techniques pour le **Bot Whatsapp Général**, un agent IA automatisé via n8n. Ce bot agit en tant que secrétaire médical virtuel pour le cabinet du Dr. Mô, gérant les interactions patients via WhatsApp.

### 1.1 Objectif
Automatiser la gestion des rendez-vous médicaux (prise de rendez-vous, annulation, report) et fournir des informations de base aux patients via une interface conversationnelle naturelle sur WhatsApp, tout en filtrant les urgences médicales.

### 1.2 Portée
Le système gère :
*   La réception des messages WhatsApp des patients.
*   L'analyse de l'intention (RDV, info, urgence).
*   L'interaction avec l'agenda médical (Cal.com).
*   La réponse au patient via WhatsApp.

## 2. Personnas Utilisateurs

*   **Le Patient :** Souhaite prendre, annuler ou modifier un rendez-vous rapidement sans attendre au téléphone. Il peut être en situation de douleur.
*   **Le Docteur (Dr. Mô) :** Souhaite que son agenda soit rempli automatiquement, que les urgences soient identifiées, et que ses patients soient traités avec professionnalisme.

## 3. Spécifications Fonctionnelles

### 3.1 Rôle et Personnalité de l'IA
*   **Rôle :** Secrétaire médical assistant.
*   **Ton :** Professionnel, bref, direct et rassurant.
*   **Contraintes :**
    *   Ne JAMAIS donner de conseil médical.
    *   Vérifier systématiquement s'il s'agit d'une urgence douloureuse.

### 3.2 Gestion des Rendez-vous (Intégration Cal.com)
L'agent doit être capable d'effectuer les actions suivantes via l'API Cal.com :

#### 3.2.1 Vérification de Disponibilité (`check availability1`)
*   Rechercher les créneaux libres sur une plage horaire donnée (08:00 - 20:00).
*   **Règle stricte :** Ne proposer QUE les créneaux explicitement retournés par l'outil. Ne jamais inventer de disponibilité.

#### 3.2.2 Prise de Rendez-vous (`Book Appointment`)
*   Réserver un créneau après confirmation de l'heure par l'utilisateur.
*   Collecter les informations : Nom, Email (si disponible), Description, Titre.
*   Injecter automatiquement le numéro WhatsApp (WaId) du patient.
*   Fuseau horaire : Europe/Paris.

#### 3.2.3 Consultation des Rendez-vous (`Get booking information`)
*   Retrouver les rendez-vous existants associés au numéro WhatsApp de l'utilisateur.
*   **Sécurité :** Filtrer strictement les RDV par `waId` (metadata). Un utilisateur ne peut voir que ses propres RDV.

#### 3.2.4 Annulation (`Cancel booking`)
*   Annuler un rendez-vous existant identifié par son UID.
*   Motif : Fourni par l'utilisateur ou par défaut "User requested cancellation".

#### 3.2.5 Report (`Reschdule Booking`)
*   Modifier l'horaire d'un rendez-vous existant.
*   Nécessite l'UID du RDV et la nouvelle date au format ISO 8601.

### 3.3 Contexte Temporel
L'IA doit comprendre les références temporelles relatives (ex: "lundi prochain", "demain") grâce à un contexte injecté dynamiquement contenant la date du jour et les dates des jours de la semaine à venir.

## 4. Spécifications Techniques

### 4.1 Architecture (Workflow n8n)
Le système repose sur un workflow n8n composé des nœuds suivants :

1.  **Entrée :** `Webhook` (Reçoit le message WhatsApp + WaId).
2.  **Configuration :** `CONFIG CLIENTS` (Définit l'ID de l'événement Cal.com et le nom du docteur).
3.  **Contexte :** `Code in JavaScript` (Calcule les dates actuelles et futures pour l'IA).
4.  **Cerveau :** `AI Agent` (LangChain Agent avec mémoire tampon).
    *   Modèle : OpenAI `gpt-4o-mini`.
    *   Mémoire : `Simple Memory` (Fenetre de 10 échanges).
5.  **Sortie :** `Send an SMS/MMS/WhatsApp message` (Twilio).

### 4.2 Flux de Données
1.  Message entrant (Twilio -> Webhook).
2.  Enrichissement du contexte (Config + Date).
3.  Traitement IA :
    *   Analyse du prompt système.
    *   Appel éventuel aux outils (Cal.com API).
    *   Génération de la réponse textuelle.
4.  Envoi de la réponse (Twilio).

### 4.3 Sécurité et Confidentialité
*   **Authentification API :** Utilisation de Bearer Token pour Cal.com (`cal_live_...`).
*   **Isolation des données :** Vérification stricte du `waId` dans les métadonnées des rendez-vous pour empêcher l'accès aux données d'autres patients.
*   **Conformité :** Pas de stockage de données médicales sensibles dans le prompt système, uniquement la gestion administrative.

## 5. Instructions Système (Prompt IA)
Le prompt système définit les règles impératives :
*   Priorité à la détection d'urgence.
*   Utilisation obligatoire des outils pour toute question d'agenda.
*   Interdiction d'halluciner des créneaux horaires.
*   Gestion des alternatives si le créneau demandé est pris.

## 6. Futurs Améliorations (Hors périmètre actuel)
*   Gestion multilingue explicite (actuellement configuré pour le Français).
*   Intégration d'une base de connaissance (RAG) pour répondre aux questions fréquentes sur le cabinet (adresse, tarifs).
