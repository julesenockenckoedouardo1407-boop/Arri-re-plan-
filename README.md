# Jules arrière plan — Caméra

PWA Android de prise de photos et de vidéos.

## Structure
Tous les fichiers sont à la racine du dépôt. Aucun sous-dossier n'est nécessaire.

- index.html
- style.css
- app.js
- manifest.json
- sw.js
- icon-192.png
- icon-512.png

## Fonctions
- caméra avant/arrière
- photos
- vidéos
- galerie locale
- sauvegarde dans IndexedDB
- interface installable PWA
- Service Worker offline-first
- plein écran via l'interface PWA

## Déploiement
1. Décompresse le ZIP.
2. Envoie TOUS les fichiers directement à la racine de ton dépôt GitHub.
3. Active GitHub Pages.
4. Ouvre l'application avec son adresse HTTPS sur Android.
5. Autorise la caméra et le microphone.
6. Installe la PWA.

Important : la caméra nécessite HTTPS (ou localhost). Le mode hors connexion concerne l'application et ses ressources après la première visite ; l'accès caméra reste soumis aux permissions Android/navigateur.

Les photos et vidéos prises par cette PWA sont conservées dans le stockage local de l'application (IndexedDB). Selon le navigateur et Android, elles ne sont pas automatiquement ajoutées à la galerie système.
