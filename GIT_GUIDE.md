# 🐙 Guide de Survie Git & GitHub

Ce guide récapitule les commandes et bonnes pratiques essentielles pour gérer ton projet d'automatisation WhatsApp.

---

## 🚀 Le Workflow Quotidien

C'est la boucle de travail classique à faire à chaque session :

1.  **Récupérer les changements (si tu travailles sur un autre PC)** :
    ```bash
    git pull origin main
    ```
2.  **Préparer tes modifications** :
    ```bash
    git add .
    ```
3.  **Enregistrer tes modifications (localement)** :
    ```bash
    git commit -m "feat: ajout de la validation des horaires"
    ```
4.  **Envoyer sur GitHub** :
    ```bash
    git push origin main
    ```

---

## 🛠️ Commandes Indispensables

| Commande | Utilité |
| :--- | :--- |
| `git status` | Voir quels fichiers ont été modifiés et s'ils sont prêts à être commités. |
| `git log --oneline` | Voir l'historique simplifié de tes derniers commits. |
| `git diff` | Voir précisément les lignes de code changées avant de commiter. |
| `git checkout -b <nom>` | Créer et basculer sur une nouvelle **branche** (pour tester un truc). |
| `git checkout main` | Revenir sur la branche principale. |

---

## 💡 Les Bonnes Pratiques

### 1. Commits "Atomiques"
Fais des commits pour chaque petite étape logicielle réussie. Ne mélange pas une correction de bug graphique et l'ajout d'une fonctionnalité métier dans le même commit.

### 2. Le fichier `.gitignore`
Ton projet contient déjà un `.gitignore`. Il empêche d'envoyer :
- Ta configuration secrète (`.env`)
- Les dossiers lourds (`node_modules`, `dist`)
- Les fichiers temporaires du système (`.DS_Store`)

**Règle d'or :** Si tu crées un nouveau fichier contenant des mots de passe, ajoute-le immédiatement dans le `.gitignore`.

### 3. Conventions de messages
Utilise des préfixes pour tes messages de commit pour t'y retrouver plus vite :
- `feat:` (nouvelle fonctionnalité)
- `fix:` (correction d'un bug)
- `docs:` (documentation ou PRD)
- `refactor:` (nettoyage de code sans changement de fonctionnalité)

---

## 🆘 Au secours ! (En cas d'erreur)

- **J'ai fait une erreur dans mon code et je veux revenir au dernier commit propre :**
  ```bash
  git restore .
  ```
- **Je me suis trompé dans le texte de mon dernier commit :**
  ```bash
  git commit --amend -m "Nouveau message correct"
  ```
- **J'ai supprimé un fichier par erreur et je veux le récupérer :**
  ```bash
  git checkout chemin/vers/le/fichier
  ```

---

## 📂 Structure Git du projet
Ton dépôt est actuellement branché sur : `https://github.com/arthurmooo/WhatsappAuto.git` sur la branche `main`.
