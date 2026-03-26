# 🎨 PROJET : PIXEL-MODERN (Éditeur Photo)

## 🎨 ESTHÉTIQUE & UI (DESIGN "DARK STUDIO")
- **Style :** Interface ultra-sombre (#0A0A0A).
- **Accents :** Utiliser une seule couleur d'accent (ex: Violet électrique ou Bleu Néon).
- **Interactivité :** Utiliser `framer-motion` pour des transitions fluides entre les outils.
- **Minimalisme :** Les barres d'outils ne doivent pas avoir de fond opaque, mais un effet "Frosted Glass" (Glassmorphism léger).

## 🚫 CONTRAINTES STRICTES (NE PAS FAIRE)
- **PAS de composants shadcn par défaut :** Construire des boutons et sliders personnalisés avec Tailwind pour un look plus "logiciel pro".
- **PAS de bibliothèques IA externes :** Tout le traitement doit rester local (Canvas API).
- **PAS de support RAW :** Uniquement JPEG et PNG pour le moment.
- **PAS de stockage Cloud :** Tout se passe dans le navigateur (Local Storage uniquement).
- **PAS de menus contextuels natifs :** Créer des menus stylisés en HTML/CSS.

## 🏗️ PRIORITÉ 1 : LE MOTEUR GRAPHIQUE
- Stage `react-konva` interactif.
- Zoom intelligent (centré sur le curseur de la souris).
- Système de calques prêt pour le multi-layer.
## 🖱️ INTERACTION & AFFICHAGE IMAGE (PHASE 1.2)
- **Importation :** L'image doit être centrée automatiquement sur le Stage à l'import.
- **Zoom Intelligent :** Le zoom doit se faire au niveau du curseur de la souris (scroll wheel).
- **Limites de Zoom :** Minimum 0.1x, Maximum 20x.
- **Pan (Déplacement) :** - Activer le déplacement du Stage avec le clic droit ou en maintenant la touche Espace.
    - Changer le curseur en "main" (`grabbing`) lors du déplacement.
- **UI Flottante :** - Un petit indicateur de pourcentage de zoom en bas à droite.
    - Un bouton "Reset View" pour recentrer l'image.
    - **Logique de Navigation :**
    - Utiliser la propriété `draggable` sur le Stage uniquement sous condition.
    - **Condition de déplacement :** Le déplacement s'active quand la touche **Espace** est maintenue OU quand le **bouton central** de la souris est cliqué.
    - **Curseur :** Le curseur doit devenir `grab` au survol si Espace est pressé, et `grabbing` pendant le mouvement.
    ## 🎚️ PHASE 2 : RÉGLAGES COLORIMÉTRIQUES (NON-DESTRUCTIFS)
- **UI :** Créer un panneau flottant à droite nommé "Ajustements".
- **Design :** Fond `glassmorphism` sombre, bordures fines, typographie minimaliste.
- **Réglages (Sliders) :**
    - **Exposition :** Modifie la clarté globale.
    - **Contraste :** Différence entre les tons clairs et sombres.
    - **Saturation :** Intensité des couleurs.
    - **Température :** Balance entre le Bleu (froid) et le Jaune (chaud).
- **Technique :** Utiliser les filtres Konva (`Konva.Filters.Brighten`, `Contrast`, `HSV`).
- **Performance :** Le rendu doit être fluide (utiliser un `RequestAnimationFrame` ou optimiser les calculs de pixels).
## ⚡ OPTIMISATION DES PERFORMANCES (CRITIQUE)
- **Konva Caching :** Appeler `imageNode.cache()` à chaque modification des filtres pour booster les performances.
- **Debouncing/Throttling :** Limiter la fréquence de rafraîchissement des filtres pendant le mouvement du slider (max 60fps).
- **Format de données :** S'assurer que les filtres sont appliqués sur une version optimisée du layer.
- **Hardware Acceleration :** Forcer l'utilisation de la carte graphique (GPU) via les styles CSS du Canvas.
## 🖐️ ERGONOMIE DES SLIDERS (UX)
- **Cible tactile/souris :** Augmenter la zone de clic du curseur (Thumb) pour qu'il soit facile à attraper.
- **Feedback Visuel :** - Le curseur doit changer de taille ou de couleur au survol (hover).
    - La barre du slider (Track) doit avoir une couleur d'accent qui se remplit au fur et à mesure du réglage.
- **Valeur Numérique :** Afficher la valeur à côté du slider (ex: +25) pour plus de précision.
- **Curseur de souris :** Utiliser `cursor: pointer` sur toute la barre et `cursor: grabbing` pendant le mouvement.
## ✂️ PHASE 3 : TRANSFORMATION & CROP
- **Outil Crop :** Créer un mode "Recadrage" activable via un bouton dans la barre latérale gauche.
- **Interface de Crop :**
    - Afficher un rectangle semi-transparent avec des poignées (handles) aux 4 coins.
    - Assombrir la zone de l'image qui sera supprimée.
    - Permettre de déplacer le rectangle de sélection.
- **Fonctionnalités :**
    - Bouton "Appliquer le Crop" et bouton "Annuler".
    - Conserver la qualité de l'image après la coupe.
- **Rotation :** Ajouter des boutons pour une rotation rapide de 90° (gauche/droite).
## 🛠️ CORRECTIONS CRITIQUES (PHASE 3.1)
- **Interaction :** Le Zoom (molette) doit RESTER ACTIF pendant le mode Crop. Seul le Pan (Espace) peut être limité si nécessaire, mais l'idéal est de garder les deux.
- **Persistance des Filtres :** Lors de l'application du Crop, l'application doit sauvegarder les valeurs actuelles des sliders et les ré-appliquer immédiatement sur la nouvelle image recadrée.
- **Ordre des opérations :** 1. Calculer les nouvelles dimensions.
    2. Créer le nouveau rectangle d'image (Crop).
    3. Ré-injecter les filtres Konva (Exposure, Contrast, etc.) sur le nouveau nœud.
    ## 🖼️ PHASE 4 : SYSTÈME DE CALQUES (LAYERS)
- **UI :** Créer un panneau flottant à droite (en dessous ou à côté des Ajustements) nommé "Calques".
- **Fonctionnalités :**
    - Liste des éléments présents sur le Canvas (Images, Textes).
    - Bouton "Cacher/Afficher" (icône œil).
    - Slider d'Opacité propre à chaque calque.
    - Possibilité de sélectionner un calque pour lui appliquer les réglages de la Phase 2.
- **Ajout de contenu :**
    - Permettre d'importer plusieurs images successivement.
    - Chaque image devient un nouveau calque sélectionnable.
- **Drag & Drop :** (Optionnel pour l'instant) Réorganiser l'ordre des calques
## 🖱️ PHASE 4.2 : ERGONOMIE & GESTION DES CALQUES
- **Drag & Drop (Réorganisation) :**
    - Ajouter une poignée de déplacement (icône `GripVertical`) à gauche de chaque calque.
    - Seule cette poignée permet de déplacer le calque dans la liste via `framer-motion`.
    - L'ordre de la liste (Haut vers Bas) = Ordre d'affichage (Premier plan vers Arrière-plan).
- **Renommage (Édition) :**
    - Permettre de modifier le nom d'un calque en double-cliquant sur son texte.
    - Remplacer le texte par un `input` temporaire lors de l'édition.
    - Valider le nouveau nom avec la touche "Entrée" ou en cliquant à l'extérieur (onBlur).
- **Sélection :** - Un simple clic sur le nom (hors édition) ou la miniature sélectionne le calque pour la Phase 2.
- **Suppression :** - Icône "Poubelle" à droite pour supprimer le calque du projet.
## ✍️ PHASE 5 : TEXTE & FORMES (ÉLÉMENTS VECTORIELS)
- **Outil Texte :** - Ajouter un bouton "T" dans la barre d'outils à gauche.
    - Cliquer sur le Canvas ajoute un calque texte par défaut ("Nouveau Texte").
- **Réglages du Texte (Panneau Ajustements) :**
    - Quand un calque texte est sélectionné, afficher des options spécifiques : 
        - Choix de la Police (Google Fonts de base).
        - Taille de la police (Slider).
        - Couleur du texte (Color Picker).
        - Alignement (Gauche, Centre, Droite).
- **Manipulation :** - Le texte doit être déplaçable directement sur le Canvas à la souris.
    - Double-cliquer sur le texte sur le Canvas pour modifier le contenu.
    ## 🎯 PHASE 5.1 : SÉLECTION DIRECTE SUR CANVAS
- **Interaction :** Cliquer sur une image ou un texte sur le Canvas doit le sélectionner automatiquement dans la liste des calques.
- **Priorité :** Si deux calques se superposent, c'est celui qui est au premier plan (le plus haut dans la liste) qui est sélectionné.
- **Feedback visuel :** - Ajouter une bordure de sélection (Transformer Konva) autour de l'objet cliqué.
    - Mettre en surbrillance la ligne correspondante dans le panneau 'Calques' à droite.
- **Désélection :** Cliquer sur le fond vide du Canvas désélectionne tout.
- **Conflit Pan/Selection :** Le clic pour sélectionner ne doit pas déplacer le Stage (différencier le clic simple du maintien de la touche Espace).
## 📄 PHASE 6.1 : EXPORT MULTI-FORMAT (PDF)
- **Bibliothèque :** Utiliser `jspdf` pour la génération du document.
- **Format :** Proposer un export au format A4 par défaut (Portrait/Paysage selon l'image).
- **Qualité :** Insérer le rendu du Canvas en haute résolution (JPEG 1.0) à l'intérieur du PDF.
- **UI :** Transformer le bouton "Exporter" en un petit menu déroulant (Dropdown) :
    - Exporter en PNG (Web)
    - Exporter en JPG (Photo)
    - Exporter en PDF (Document/Impression)
    ## 📐 PHASE 6.2 : EXPORT CADRÉ (SMART CROP)
- **Logique d'Export :** Ne pas exporter le `Stage` entier, mais uniquement la zone contenant les calques.
- **Calcul :** Utiliser `group.getClientRect()` ou calculer l'union des rectangles de tous les calques visibles.
- **Transparence :** - Pour le **PNG**, le fond hors-calques doit être transparent.
    - Pour le **JPG/PDF**, le fond doit être blanc par défaut (pas noir).
- **Auto-Trim :** Supprimer les marges vides inutiles autour de la composition finale.
## ⏪ PHASE 7 : HISTORIQUE (UNDO / REDO)
- **Système :** Implémenter une pile d'états (History Stack) limitée à 30 actions.
- **Actions enregistrées :** - Déplacement/Redimensionnement d'un calque.
    - Modification des réglages (Sliders).
    - Ajout/Suppression/Renommage de calque.
    - Changement d'ordre des calques.
- **Raccourcis Clavier :** - `Ctrl + Z` (ou `Cmd + Z`) pour Annuler.
    - `Ctrl + Y` ou `Ctrl + Shift + Z` pour Rétablir.
- **UI :** Ajouter deux flèches (Retour/Avant) dans la barre d'outils du haut.
## 🎭 PHASE 8 : FILTRES ARTISTIQUES & PRESETS
- **UI :** Créer un ruban horizontal en bas de l'écran nommé "Galerie de Filtres".
- **Interaction :** Cliquer sur un filtre l'applique instantanément au calque IMAGE sélectionné.
- **Liste des Filtres (Presets) :**
    - **Original :** Reset de tous les sliders.
    - **B&W (Noir & Blanc) :** Saturation à -1, Contraste augmenté.
    - **Vintage :** Température chaude, Contraste doux, Saturation légère.
    - **Cinéma :** Teinte bleutée, Contraste fort, Exposition réduite.
    - **Punch :** Saturation +40%, Contraste +20%.
- **Technique :** Les filtres doivent être cumulables avec les réglages manuels (les sliders doivent se mettre à jour visuellement quand on clique sur un filtre).
## 🎭 PHASE 8.1 : INTÉGRATION UX DES PRESETS
- **Localisation :** Déplacer la section "Presets" en haut du panneau "Ajustements" (Sidebar droite).
- **Organisation :** - Créer une section compacte (grille ou boutons de pilules) intitulée "Styles Rapides".
    - Placer ces boutons au-dessus des sliders de réglages fins (Exposition, Saturation, etc.).
- **Logique de Commande :** Le clic sur un preset doit physiquement déplacer les sliders correspondants pour montrer à l'utilisateur ce qui a été modifié.
- **Bouton Reset :** Ajouter un bouton "Réinitialiser l'image" bien visible pour remettre tous les filtres et sliders à leur état d'origine (1 ou 0 selon le paramètre).
## 📂 PHASE 8.2 : ORGANISATION DU PANNEAU (ACCORDÉONS)
- **Structure :** Diviser le panneau "Ajustements" en sections pliables :
    - **Styles Rapides** (Presets)
    - **Ajustements Lumineux** (Exposition, Contraste, Luminosité)
    - **Couleurs** (Saturation, Température, Teinte)
    - **Propriétés du Texte** (si un texte est sélectionné)
- **Interaction :** - Chaque section a un en-tête cliquable avec une petite flèche (chevron).
    - Cliquer sur l'en-tête ouvre ou ferme la section.
    - Optionnel : Fermer automatiquement les autres sections quand on en ouvre une (mode "Solo").
- **État :** Garder les sections "Ajustements" ouvertes par défaut lors de la sélection d'une image.
## 🎨 PHASE 9 : MODES DE FUSION (BLENDING MODES)
- **UI :** Ajouter un menu déroulant "Mode de fusion" dans le panneau "Calques" (à côté de l'opacité).
- **Options de fusion :** Intégrer les modes standards de Konva :
    - **Normal** (par défaut)
    - **Multiply** (Multiplier : parfait pour les ombres/noir)
    - **Screen** (Écran : parfait pour la lumière/blanc)
    - **Overlay** (Incrustation : mélange contraste et couleurs)
    - **Darken / Lighten** (Obscurcir / Éclaircir)
- **Interaction :** Le changement de mode doit être instantané sur le Canvas pour le calque sélectionné.
- **Historique :** Chaque changement de mode de fusion doit être enregistré dans le Undo/Redo.
## 📐 PHASE 9.1 : BARRE LATÉRALE UNIFIÉE (SIDEBAR RIGHT)
- **Structure Verticale :** - **Section 1 (Fixe) :** Gestion des Calques (Liste, Drag&Drop, Opacité, Modes de Fusion). Toujours visible.
    - **Section 2 (Dynamique) :** Accordéons des Réglages (Styles, Lumière, Couleur OU Texte). 
- **Logique d'Affichage :** - Si "Aucun calque sélectionné" : Afficher un message discret dans la Section 2 ("Sélectionnez un calque pour modifier").
    - Si "Calque sélectionné" : Déplier automatiquement les accordéons pertinents.
- **Scroll :** La barre latérale doit avoir un scroll indépendant pour ne jamais cacher la liste des calques si les réglages sont longs.
## 🖌️ PHASE 11 : DESSIN À LA MAIN (BRUSH TOOL)
- **Outil :** Ajouter une icône "Crayon" ou "Pinceau" dans la barre d'outils à GAUCHE.
- **Logique Konva :** Utiliser `Konva.Line` avec `globalCompositeOperation` pour le tracé.
- **Réglages (Droite) :** Quand l'outil Pinceau est actif, afficher :
    - **Taille du pinceau** (Slider).
    - **Couleur du pinceau** (Sélecteur).
    - **Dureté/Opacité**.
- **Interaction :** Dessiner directement sur un nouveau calque de type "Dessin".
## 🗂️ PHASE 12 : GESTION DES CALQUES (Z-INDEX & VISIBILITÉ)
- **UI :** Dans la liste des calques à DROITE, ajouter des icônes pour chaque ligne :
    - **Oeil (Lucide `Eye` / `EyeOff`) :** Pour masquer/afficher un calque.
    - **Cadenas (`Lock` / `Unlock`) :** Pour empêcher de déplacer ou modifier un calque par erreur.
- **Réorganisation :** - Permettre de monter/descendre un calque dans la pile (Boutons flèches Haut/Bas).
- **Suppression :** Ajouter une petite corbeille (`Trash2`) à côté de chaque calque pour le supprimer rapidement.
- **Nommage :** Permettre de double-cliquer sur le nom (ex: 'Texte 1') pour le renommer.
## ✨ PHASE 13 : UX, COPIER-COLLER & AUTO-SAVE
- **Raccourcis Essentiels :** - `Suppr` : Supprimer le calque sélectionné.
    - `Ctrl + C / Ctrl + V` (ou Cmd) : Dupliquer le calque sélectionné.
- **Magnétisme (Smart Guides) :** Afficher des lignes roses d'alignement quand un objet est centré ou aligné avec un autre.
- **Auto-Save (LocalStorage) :** Sauvegarder la scène automatiquement pour la retrouver après un rafraîchissement (F5).
- **Gestion du Focus :** Cliquer dans le vide (sur le fond du canvas) doit désélectionner tous les calques.
## 🎨 PHASE 15 : UI PREMIUM & DARK MODE
- **Thème :** Appliquer une charte graphique cohérente (ex: Slate/Zinc de Tailwind).
- **Tooltips :** Ajouter des petites bulles d'aide quand on survole les icônes (ex: "Pinceau", "Exporter").
- **États Visuels :** - Améliorer le style du calque "Sélectionné" dans la liste à droite (bordure colorée).
    - Ajouter une transition douce (hover) sur tous les boutons.
- **Responsive :** Vérifier que les barres latérales ne mangent pas tout l'espace sur les petits écrans.
## 🏗️ PHASE 16 : ARCHITECTURE HYBRIDE (CANVA + LIGHTROOM)
- **Barre de GAUCHE (Outils) :** - GARDER : Sélection, Formes (Nouveau), Texte, Image, Pinceau.
    - SUPPRIMER : Zoom, Déplacer (visuellement).
- **Barre de HAUT (Style Contextuel) :** - S'affiche quand un objet (Forme, Texte, Dessin) est sélectionné.
    - REGLAGES : Couleur de remplissage (Fill), Couleur du contour (Stroke), Épaisseur du contour.
- **Barre de DROITE (Retouche & Calques) :**
    - GARDER : Liste des calques (Layers).
    - GARDER : Filtres d'image (Exposition, Contraste, Saturation, Lumière, Couleur).
- **Outil FORMES :** Ajouter Rectangle, Cercle, Triangle (avec redimensionnement proportionnel).
## 🚀 PHASE 17 : MULTI-SÉLECTION & TYPOGRAPHIE WYSIWYG
- **Multi-Sélection :** - Permettre de sélectionner plusieurs éléments (Maj + Clic ou Rectangle de sélection).
    - Un seul Transformer englobe le groupe pour déplacement.
    - **Action de Groupe :** Le bouton "Poubelle" (ou touche Delete) doit supprimer TOUS les éléments sélectionnés d'un coup.
- **Barre du HAUT :** Apparaît uniquement si UNE SEULE forme est sélectionnée (se cache en multi-sélection).
- **Polices (Aperçu) :** - Menu déroulant avec au moins 10 Google Fonts.
    - **UI :** Dans la liste, chaque nom de police doit être affiché avec sa propre police (ex: 'Bebas Neue' écrit en Bebas Neue).
- **Nettoyage :** Pas de presets de texte (Titre/Sous-titre), garder l'outil texte simple.
## 📄 PHASE 18 : FOND DE PAGE & QUALITÉ D'EXPORT
- **Fond du Canvas :** - Ajouter une option "Fond Blanc" par défaut (comme une feuille A4).
    - Permettre de changer la couleur de ce fond (via la barre du haut quand rien n'est sélectionné).
- **Export Retina (2x) :** Booster la résolution de l'export PNG/JPEG pour éviter le flou.
- **Gestion des Calques :** - Drag-and-drop pour réordonner les calques.
    - Double-clic pour renommer.
- **Feedback :** Ajouter une petite notification (Toast) "Image exportée !" en bas de l'écran.
## ✅ STRUCTURE STABLE (PHASE 20)
- **Artboard Central :** Page blanche de 1080x1080px par défaut.
- **Dimensions :** Menu pour choisir le format (A4, Carré, Personnalisé).
- **Calques :** Liste à droite avec Drag & Drop pour l'ordre et Double-clic pour renommer.
- **Typographie :** Liste de 10+ Google Fonts avec aperçu visuel dans le menu.

## ⚠️ EN PAUSE (À NE PAS TRAITER POUR L'INSTANT)
- [STOP] Export PNG/JPG (Bug écran noir : on verra à la fin).
- [STOP] Smart Guides / Magnétisme (Provoque des crashs).
## 📦 PHASE 21 : ÉLÉMENTS DE BASE (PAS À PAS)
- **Priorité :** Efficience du code et légèreté du rendu.
- **Bibliothèque :** Ajouter un panneau simple à gauche avec des icônes pour : 
    - Formes : Étoile, Flèche, Cœur.
- **Comportement :** Cliquer sur une forme l'ajoute au centre de l'Artboard (Page blanche).
- **Auto-Focus :** L'élément ajouté est sélectionné immédiatement.
- **Optimisation :** Utiliser uniquement `batchDraw()` pour rafraîchir le canvas.
## 🛠️ État de l'Interface & Structure (MAJ 20/03/2026)
- **Sidebar Gauche :** `position: fixed`, `height: 100vh`, `z-index: 1000`. Doit inclure un `overflow-y: auto` pour scroller dans les formes.
- **Top Bar :** Les boutons Undo/Redo et Export doivent avoir un `margin-left` suffisant (min 80px) pour ne pas être recouverts par la sidebar.
- **Export Modale :** Doit être centrée via `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);`. L'aperçu doit utiliser `object-fit: contain`.
## 💾 Phase 23 : Système d'Historique Unifié (À implémenter)
- **Emplacement :** Menu déroulant (dropdown) attaché aux boutons Undo/Redo existants.
- **Fonctionnement :** - Capturer un `snapshot` (vignette 0.1 pixelRatio) à chaque fin d'action (`dragend`, `transformend`, `change`).
    - Stocker les 15 derniers états.
    - Cliquer sur une vignette dans le menu déroulant doit restaurer l'état du Stage Konva correspondant.
- **Priorité Performance :** Utiliser `batchDraw()` après chaque restauration d'état pour éviter les lags.
## 🖌️ Outil Pinceau (Brush/Pencil) - Config
- **Couleur par défaut :** #000000 (Noir) impératif.
- **Taille de trait :** 5px par défaut.
- **Comportement :** Doit être visible immédiatement sur l'Artboard blanc.
- **Mode Konva :** Utiliser `globalCompositeOperation: 'source-over'`.
## 📏 Guidage & Alignement (Smart Guides)
- **Comportement :** Afficher des lignes magnétiques (pointillés fins) lors du déplacement d'un objet.
- **Axes :** Alignement automatique sur le centre horizontal/vertical du Stage et sur les bords des autres formes.
- **Rendu :** Les guides sont temporaires et ne doivent JAMAIS être exportés (PNG/PDF).
## 🗑️ Action de Nettoyage (Global Reset)
- **Bouton :** Placer un bouton 'Tout effacer' (icône poubelle) de préférence en rouge.
- **Sécurité :** Déclencher une fenêtre de confirmation (`window.confirm`) : "Êtes-vous sûr de vouloir tout effacer ? Cette action est irréversible."
- **Exécution :** Si confirmé, vider tous les calques et réinitialiser l'Artboard à son état d'origine.
## 🚀 Préparation Déploiement (Vercel)
- **Metadata :** Titre de l'app "Mon Studio Créatif", icône personnalisée.
- **Persistence :** Sauvegarde automatique du `stage` dans le `localStorage`.
- **Nettoyage :** Suppression de tous les `console.log` et commentaires de debug avant le push GitHub.
## 🧹 Nettoyage des Exports (PNG/PDF/JPEG)
- **Suppression des Artefacts :** Avant chaque génération d'export (image ou document), le code doit impérativement vider le tableau des `nodes` du Transformer (`transformer.nodes([])`).
- **Rendu Pur :** Aucun cadre de sélection, poignée de redimensionnement ou guide d'alignement ne doit être visible sur le fichier téléchargé.
- **Rafraîchissement :** Appeler `layer.batchDraw()` immédiatement avant la capture pour garantir que le canvas est "propre".

## 🖼️ Gestion des Images & Styles
- **Zéro Effet par Défaut :** Toutes les images importées doivent avoir les propriétés `shadowColor`, `shadowBlur`, `shadowOffset` et `shadowOpacity` définies à 0.
- **Filtres :** Aucun filtre de couleur ou d'assombrissement ne doit être appliqué automatiquement lors de l'ajout d'un élément sur le Stage.
- **Couleur par défaut :** Tout nouvel élément (Texte, Formes, Pinceau) doit être créé avec la couleur `#000000` (Noir).
Confirme que Noir (#000000) est la couleur de remplissage par défaut pour toutes les formes.
Précise que la forme Étoile doit avoir 5 branches définies via Konva.Star