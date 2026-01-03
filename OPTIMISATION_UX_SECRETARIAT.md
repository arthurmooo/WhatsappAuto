# 🎭 AUDIT UX & PSYCHOLOGIE CONVERSATIONNELLE
## MODE "EXCELLENCE" - Secrétariat Médical de Haut Niveau

**Date d'Audit:** 3 Janvier 2026  
**Standard de Référence:** Secrétaire médicale de haut niveau - proactive, précise, impeccable  
**Localisation:** Cabinet de Kinésithérapie, Vallée de l'Arve

---

## 📊 SYNTHÈSE DES PARCOURS AUDITÉS

| Parcours | Statut | Points d'Amélioration |
|----------|--------|----------------------|
| Patient Pressé | 🟡 Moyen | Densité d'info, rapidité |
| Indécis Chronique | 🟡 Moyen | Proactivité alternatives |
| Le Curieux | 🟢 Bon | Knowledge base solide |
| Senior sur WhatsApp | 🟠 À améliorer | Empathie, patience |
| Bug de Logique | 🟢 Bon | Validation temporelle OK |
| Le Digital Native | 🟡 Moyen | Ton trop formel |
| Le Stressé Médical | 🟠 À améliorer | Réassurance insuffisante |
| Le Multi-Créneau | 🔴 Critique | Pas de comparaison |
| Le Reporter Chronique | 🟡 Moyen | Pas de friction douce |
| Le Primo-Consultant | 🟠 À améliorer | Pas d'onboarding |

---

## 🔴 DÉFAUTS CRITIQUES

---

### DÉFAUT #1 - Absence de Proactivité Alternative

**Scénario:** Le patient demande un créneau spécifique qui n'existe pas.

**Input Utilisateur:** "Je veux mardi à 14h"

**Réponse Bot (actuelle):** "Je vérifie les disponibilités pour mardi... Malheureusement, aucun créneau n'est disponible mardi à 14h. Souhaitez-vous que je vérifie un autre jour ?"

**Le Défaut:** Le bot attend que l'utilisateur propose une alternative. Une secrétaire d'excellence proposerait immédiatement les créneaux LES PLUS PROCHES en temps (13h30, 14h30 même jour) ou le même créneau le jour suivant.

**Correction Suggérée:**
```markdown
# Dans le System Prompt, ajouter dans GUIDELINES OPÉRATIONNELLES :

RÈGLE DE PROACTIVITÉ ALTERNATIVE :
- Si un créneau demandé est indisponible, NE DIS JAMAIS simplement "indisponible".
- TOUJOURS proposer IMMÉDIATEMENT les 2 alternatives les plus proches :
  1. Le créneau le plus proche LE MÊME JOUR (avant ou après)
  2. Le MÊME créneau le jour ouvré suivant
- Format : "Ce créneau est pris. Je vous propose : [Alternative 1] ou [Alternative 2]. Lequel préférez-vous ?"
```

---

### DÉFAUT #2 - Messages Trop Longs (Densité d'Information)

**Scénario:** Confirmation de rendez-vous.

**Input Utilisateur:** "OK pour 10h"

**Réponse Bot (actuelle):** "Parfait ! Je vais bloquer le créneau de 10h00 pour vous. Pour finaliser la réservation, j'ai besoin de quelques informations. Pourriez-vous me communiquer votre nom complet et votre adresse email, s'il vous plaît ? Cela me permettra de confirmer officiellement votre rendez-vous."

**Le Défaut:** 3 phrases pour demander 2 infos. Sur mobile, ça nécessite de scroller. Perte de temps perçue.

**Correction Suggérée:**
```markdown
# Règle de DENSITÉ dans le System Prompt :

RÈGLE MOBILE-FIRST :
- Chaque message doit tenir dans 3 lignes sur écran mobile.
- Maximum 2 questions par message.
- Format compact : "✅ 10h bloqué. Nom complet + email pour confirmer ?"
```

---

### DÉFAUT #3 - Call-to-Action Flou

**Scénario:** Multi-propositions de créneaux.

**Input Utilisateur:** "Qu'est-ce que vous avez la semaine prochaine ?"

**Réponse Bot (actuelle):** "Voici les créneaux disponibles la semaine prochaine : Lundi 6 janvier : 9h00, 10h00, 11h00... Mardi 7 janvier : 14h00, 15h00... Mercredi 8 janvier : 9h00, 10h30... Lequel vous conviendrait le mieux ?"

**Le Défaut:** L'utilisateur reçoit une liste sans instruction claire. "Lequel vous conviendrait" est passif. Pas de numérotation pour réponse rapide.

**Correction Suggérée:**
```markdown
# Règle CALL-TO-ACTION EXPLICITE :

Quand tu proposes plusieurs créneaux, TOUJOURS :
1. Limiter à 5 créneaux maximum (sur 2-3 jours max)
2. Numéroter les options : 1️⃣, 2️⃣, 3️⃣...
3. Terminer par : "Répondez le numéro de votre choix"

Exemple :
"Voici mes meilleures propositions :
1️⃣ Lundi 6 à 9h00
2️⃣ Mardi 7 à 14h00
3️⃣ Mercredi 8 à 10h30
Répondez 1, 2 ou 3 ✏️"
```

---

### DÉFAUT #4 - Gestion Imprévu Trop Rigide

**Scénario:** Le patient change d'avis de manière informelle.

**Input Utilisateur:** "Ah mince, j'ai une raclette ce soir-là, plutôt mercredi ?"

**Réponse Bot (attendue):** Réponse empathique + vérification immédiate mercredi.

**Réponse Bot (probable actuelle):** "Je comprends. Voulez-vous que je cherche les disponibilités pour mercredi ?" (demande de confirmation inutile)

**Le Défaut:** UNE EXCELLENTE secrétaire ne demanderait PAS si elle doit chercher. Elle chercherait DIRECTEMENT et proposerait.

**Correction Suggérée:**
```markdown
# Règle COMPRÉHENSION IMPLICITE :

Si l'utilisateur mentionne un OBSTACLE ("raclette", "réunion", "je peux pas") suivi d'un AUTRE JOUR :
- NE DEMANDE PAS de confirmation pour chercher
- Appelle checkAvailability IMMÉDIATEMENT sur le nouveau jour
- Réponds : "Pas de souci pour la raclette 🧀 ! Mercredi, je vous propose : [créneaux]"
```

---

## 🟠 DÉFAUTS MOYENS

---

### DÉFAUT #5 - Ton Local Insuffisant

**Scénario:** Premier contact avec le bot.

**Input Utilisateur:** "Bonjour"

**Réponse Bot (actuelle):** "Bonjour, je suis l'assistant du kiné Mô. Comment puis-je vous aider ?"

**Le Défaut:** Trop générique. Ne reflète pas l'ancrage local "Vallée de l'Arve" / cabinet de confiance. Manque de chaleur alpine.

**Correction Suggérée:**
```markdown
# Message d'ACCUEIL PERSONNALISÉ :

"Bonjour et bienvenue au cabinet du Dr. Mô, kiné au cœur de la Vallée de l'Arve ! 🏔️
Je suis là pour vous aider à prendre rendez-vous. Que puis-je faire pour vous ?"
```

---

### DÉFAUT #6 - Senior/Technophobe Mal Accompagné

**Scénario:** Utilisateur senior avec messages longs et polis.

**Input Utilisateur:** "Bonjour Madame ou Monsieur, je me permets de vous contacter car j'aurais souhaité prendre un rendez-vous avec le docteur pour mon mal de dos qui me fait souffrir depuis plusieurs semaines maintenant. Est-ce que cela serait possible d'avoir un créneau cette semaine si vous avez des disponibilités ? Je vous remercie par avance et vous souhaite une bonne journée."

**Réponse Bot (risque):** Réponse trop concise/moderne qui déstabilise.

**Le Défaut:** Le bot ne s'adapte pas au registre de langage de l'utilisateur. Un senior attend de la politesse excessive en retour.

**Correction Suggérée:**
```markdown
# Règle MIROIR LINGUISTIQUE (Seniors) :

Si le message de l'utilisateur contient des formules de politesse longues ("Je me permets", "Je vous remercie par avance", "Bonne journée") :
- ADAPTER le registre : répondre avec politesse similaire
- Proposer le TÉLÉPHONE proactivement : "Si vous préférez, vous pouvez aussi joindre le secrétariat au 04 50 XX XX XX."
- NE JAMAIS utiliser d'emojis modernes (🔥, 💪)
- Utiliser les emojis classiques : ✅, 📞, 📅
```

---

### DÉFAUT #7 - Absence de Récapitulatif Mental

**Scénario:** L'indécis change d'avis 3 fois.

**Input Utilisateur:** 
1. "Mardi 10h" → Bot propose
2. "Non finalement jeudi" → Bot propose
3. "Ah non, reviens au premier" → ???

**Réponse Bot (risque):** "Quel était le premier créneau que vous aviez mentionné ?"

**Le Défaut:** Le bot devrait avoir en mémoire le premier choix et y revenir directement.

**Correction Suggérée:**
```markdown
# Règle MÉMOIRE DE CONVERSATION :

TOUJOURS garder en mémoire les créneaux évoqués dans la conversation.
Si l'utilisateur dit "le premier" / "revenir au précédent" / "finalement l'autre" :
- NE DEMANDE PAS de précision
- PROPOSE : "Vous vouliez revenir au créneau du mardi 7 à 10h00. Je le confirme ?"
```

---

### DÉFAUT #8 - Reporter Chronique Sans Friction

**Scénario:** Patient qui repousse plusieurs fois.

**Input Utilisateur:** 
1. "RDV demain" → Propositions
2. "Non, semaine pro" → Propositions
3. "Plutôt dans 2 semaines" → ???

**Réponse Bot (actuelle):** Continue à proposer sans rien dire.

**Le Défaut:** Une secrétaire intelligente détecterait que "ça sent l'annulation future" et ajouterait une friction douce.

**Correction Suggérée:**
```markdown
# Règle FRICTION DOUCE (Anti-Report) :

Si l'utilisateur repousse 2+ fois dans la même conversation :
- Ajouter : "Je comprends, les journées sont chargées ! Pour éviter d'oublier, je vous conseille de bloquer ce créneau maintenant. Vous pouvez toujours annuler jusqu'à 24h avant si besoin."
```

---

### DÉFAUT #9 - Primo-Consultant Sans Onboarding

**Scénario:** Nouveau patient qui ne connaît pas le cabinet.

**Input Utilisateur:** "C'est la première fois que je viens"

**Réponse Bot (probable):** "Pas de souci ! Quel jour souhaitez-vous venir ?"

**Le Défaut:** Pas d'explication sur ce qu'il faut apporter, comment ça se passe, durée, etc.

**Correction Suggérée:**
```markdown
# Règle PRIMO-CONSULTANT :

Si "première fois" / "nouveau patient" / "jamais venu" détecté :
Répondre AVANT de proposer des créneaux :
"Bienvenue ! La première consultation dure environ 45 minutes. Pensez à apporter votre carte Vitale et votre ordonnance si vous en avez une. Quel jour vous arrangerait ?"
```

---

### DÉFAUT #10 - Manque de Réassurance Médicale

**Scénario:** Patient stressé/inquiet pour sa santé.

**Input Utilisateur:** "J'ai très mal au dos depuis 3 jours, c'est grave ?"

**Réponse Bot (actuelle):** "Je ne suis pas médecin, seul le Dr Mô peut vous donner un avis médical en consultation. Souhaitez-vous prendre rendez-vous ?"

**Le Défaut:** Réponse juridiquement correcte mais humainement froide. Zéro réassurance.

**Correction Suggérée:**
```markdown
# Règle RÉASSURANCE EMPATHIQUE :

Si inquiétude détectée ("c'est grave ?", "je m'inquiète", "normal ?") :
- Démarrer par une phrase EMPATHIQUE : "Je comprends votre inquiétude."
- Ajouter une réassurance GÉNÉRIQUE (sans diagnostic) : "Les douleurs de dos sont très fréquentes et le Dr. Mô pourra vous examiner."
- PUIS : "Souhaitez-vous un RDV rapidement ?"
```

---

## 🟢 BONNES PRATIQUES DÉJÀ EN PLACE

✅ **Proactivité agenda** : Appelle `checkAvailability` sans demander "quel jour ?"  
✅ **Base de connaissances** : Répond sur adresse, documents, parking  
✅ **Validation dates** : Rejette les dates invalides (mardi 8 janvier si faux)  
✅ **Règle 24h** : Refuse annulation < 24h avec explication  
✅ **Lien calendrier** : Fourni après chaque action  
✅ **Urgences vitales** : Renvoie vers SAMU 15  

---

## 🛠️ RÉSUMÉ DES MODIFICATIONS AU SYSTEM PROMPT

### Priorité 1 (Critique)
1. Ajouter règle **PROACTIVITÉ ALTERNATIVE** (toujours 2 alternatives si créneau pris)
2. Ajouter règle **DENSITÉ MOBILE-FIRST** (3 lignes max par message)
3. Ajouter règle **CALL-TO-ACTION NUMÉROTÉ** (1️⃣, 2️⃣, 3️⃣ + "Répondez le numéro")
4. Ajouter règle **COMPRÉHENSION IMPLICITE** (pas de confirmation pour chercher si contexte clair)

### Priorité 2 (Moyen)
5. Personnaliser **MESSAGE D'ACCUEIL** avec ancrage local
6. Ajouter règle **MIROIR LINGUISTIQUE** pour seniors
7. Ajouter règle **MÉMOIRE DE CONVERSATION** pour indécis
8. Ajouter règle **FRICTION DOUCE** anti-report
9. Ajouter règle **PRIMO-CONSULTANT** onboarding
10. Ajouter règle **RÉASSURANCE EMPATHIQUE** pour inquiets

---

## 📱 PARCOURS TESTÉS EN DÉTAIL

### 1. Le Patient Pressé
**Profil:** Réponses ultra-courtes, fautes de frappe, veut un RDV immédiat.

| Input | Réponse Attendue | Défaut Identifié |
|-------|------------------|------------------|
| "rdv" | Propositions immédiates | ✅ OK |
| "dmain 10h" (faute) | Compris → propose demain | ⚠️ À vérifier |
| "ok" (après proposition) | Bloque + demande nom/email | ✅ OK |
| "jean" | Demande email | ✅ OK |

**Verdict:** 🟡 Correct mais pourrait être plus rapide (moins d'étapes).

---

### 2. L'Indécis Chronique
**Profil:** Change 3x d'avis, demande prix, demande remboursement.

| Input | Réponse Attendue | Défaut Identifié |
|-------|------------------|------------------|
| "Mardi 10h" | Propose | ✅ OK |
| "Non mercredi" | Propose mercredi | ✅ OK |
| "C'est combien ?" | Tarif secteur 1 | ✅ OK |
| "C'est remboursé ?" | Tarif conventionné | ⚠️ Pourrait préciser mutuelle |
| "Reviens au mardi" | Doit se souvenir | ❌ DÉFAUT #7 |

**Verdict:** 🟡 Manque mémoire conversation.

---

### 3. Le Curieux
**Profil:** Questions pratiques avant RDV.

| Input | Réponse Attendue | Défaut Identifié |
|-------|------------------|------------------|
| "Vous êtes où ?" | Vallée de l'Arve + parking | ✅ OK |
| "Y'a du parking ?" | Parking gratuit devant | ✅ OK |
| "Faut apporter quoi ?" | Carte Vitale + ordonnance | ✅ OK |

**Verdict:** 🟢 Bon, knowledge base solide.

---

### 4. Le Senior sur WhatsApp
**Profil:** Phrases longues, très poli, demande rappel téléphonique.

| Input | Réponse Attendue | Défaut Identifié |
|-------|------------------|------------------|
| "Bonjour Madame..." (long) | Réponse adaptée au registre | ❌ DÉFAUT #6 |
| "Pouvez-vous me rappeler ?" | Numéro secrétariat | ⚠️ Devrait être proactif |

**Verdict:** 🟠 Manque adaptation linguistique.

---

### 5. Le Bug de Logique
**Profil:** Tente dates impossibles.

| Input | Réponse Attendue | Défaut Identifié |
|-------|------------------|------------------|
| "RDV hier" | Refus → propose futur | ✅ OK |
| "Dimanche ?" | Vérifie → cabinet fermé | ✅ OK |
| "Mardi 8 janvier" (faux) | Corrige jour/date | ✅ OK |

**Verdict:** 🟢 Excellent, validation code-level.

---

### 6. Le Digital Native
**Profil:** Tutoiement, slang, emojis.

| Input | Réponse Attendue | Défaut Identifié |
|-------|------------------|------------------|
| "Yo, rdv demain ?" | Devrait s'adapter au ton | ⚠️ Reste trop formel |
| "oskour j'ai mal 😭" | Empathique mais pas SAMU | ⚠️ Risque faux positif |

**Verdict:** 🟡 Ton figé, pas d'adaptation générationnelle.

---

### 7. Le Multi-Créneau
**Profil:** Veut comparer plusieurs créneaux côte à côte.

| Input | Réponse Attendue | Défaut Identifié |
|-------|------------------|------------------|
| "Lundi ou mardi, quoi de mieux ?" | Tableau comparatif | ❌ Liste linéaire |

**Verdict:** 🔴 Pas de présentation comparative.

---

### 8. Le Procrastinateur Médical
**Profil:** Douleur depuis longtemps, hésite à consulter.

| Input | Réponse Attendue | Défaut Identifié |
|-------|------------------|------------------|
| "Ça fait mal depuis 3 mois mais bon..." | Encourager RDV | ⚠️ Manque nudge santé |

**Verdict:** 🟡 Pas de "il vaut mieux consulter rapidement".

---

## 📋 CHECKLIST FINALE D'IMPLÉMENTATION

- [ ] Modifier System Prompt : Règle PROACTIVITÉ ALTERNATIVE
- [ ] Modifier System Prompt : Règle DENSITÉ MOBILE-FIRST  
- [ ] Modifier System Prompt : Règle CALL-TO-ACTION NUMÉROTÉ
- [ ] Modifier System Prompt : Règle COMPRÉHENSION IMPLICITE
- [ ] Modifier System Prompt : MESSAGE D'ACCUEIL local
- [ ] Modifier System Prompt : Règle MIROIR LINGUISTIQUE
- [ ] Modifier System Prompt : Règle MÉMOIRE CONVERSATION
- [ ] Modifier System Prompt : Règle FRICTION DOUCE
- [ ] Modifier System Prompt : Règle PRIMO-CONSULTANT
- [ ] Modifier System Prompt : Règle RÉASSURANCE EMPATHIQUE

---

**AUDIT TERMINÉ** - 10 défauts identifiés, 4 critiques, 6 moyens.  
Prêt pour implémentation des corrections.
