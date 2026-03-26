# Pixel Modern — Spécifications d'interface (MAJ 2026-03-23)

## Sidebar gauche — organisation
La sidebar gauche (52 px fixe, `overflowX: hidden`) contient :
- **Outils** : Sélection, Recadrer, Pinceau (pinceau noir `#000000` / 5px par défaut)
- **Texte** : ajoute un `TextLayer` centré
- **Formes** (accordéon inline) : rect, cercle, triangle, étoile, flèche, cœur
  → Grid 2 colonnes, `min-height: 40px`, SVG 16px violet au survol
- **Export**
- Pas de section "Éléments/Stickers" — supprimée définitivement.

## Rendu SVG/Image sur Konva — règle critique
- `cache()` et `filters` (ExposureFilter, Contrast, HSL, Temperature) ne sont activés que si `hasAdjustments` est vrai.
- `hasAdjustments = exposure≠0 || contrast≠0 || saturation≠0 || temperature≠0`
- Si tous les ajustements sont à 0 : `clearCache()` est appelé → rendu natif SVG sans passage pixel. **AUCUN filtre, AUCUNE opacité réduite.**
- Bounding box propre : `opacity: 1` à l'insertion, pas de shadow/filter CSS.

## ⚠️ Images importées — zéro effet de style par défaut
- **AUCUN** `shadowColor`, `shadowBlur`, `shadowOffset`, ni `shadowOpacity` sur les nœuds `KonvaImage`.
- **NE PAS** ajouter de `Rect` décoratifs avec `fill` semi-transparent + `shadowBlur` autour des images : ces éléments font partie du `Stage` Konva et **s'exportent** dans les PNG/JPG/PDF, produisant un halo noir visible.
- Les effets d'ombre décoratifs (style "floating canvas") doivent être rendu en CSS pur (`box-shadow` sur le conteneur HTML du stage), jamais comme nœuds Konva.
- La `Page shadow` (artboard) utilise `fill="rgba(0,0,0,0)"` — acceptable car aucun pixel alpha n'est dessiné, le shadow est inactif.

## Couleurs par défaut — règle globale
L'artboard est blanc (`#ffffff`). Tous les nouveaux éléments doivent être **noirs** par défaut pour être immédiatement visibles.

| Élément | Propriété | Valeur par défaut |
|---------|-----------|-------------------|
| Texte | `fill` | `#000000` |
| Pinceau | `stroke` | `#000000` |
| Formes | `fill` | `#7c3aed` (violet accent) |

- Source texte : `DEFAULT_TEXT_LAYER.fill = '#000000'` dans `src/types/canvas.ts`
- Source pinceau : `useState('#000000')` dans `App.tsx`
- **NE JAMAIS** initialiser `fill` à `#ffffff` sur un texte ou un trait — invisible sur fond blanc.

---

## Stack technique
- React 18 + TypeScript + Vite
- react-konva (canvas engine)
- framer-motion (animations)
- jsPDF (export PDF)
- TailwindCSS + glassmorphism personnalisé

---

## Sidebar gauche
- `position: fixed; left: 12px; width: 52px; height: 100vh; z-index: 1000`
- Fond glassmorphism sombre (`rgba(12,12,14,0.84)`)
- `overflow-y: auto` pour les formes/icônes qui dépassent

## UndoRedoBar
- `position: fixed; top: 16px; left: 76px; z-index: 25`  ← décalée de 76 px pour ne pas être cachée par la sidebar (52 px + 12 px marge + 12 px)
- Fond glassmorphism identique à la sidebar
- Boutons Annuler / Rétablir + bouton Historique (dropdown)

## TopBar (barre contextuelle haute)
- `margin-left: min 80px` pour dégager la sidebar
- S'affiche uniquement si un objet unique est sélectionné

---

## Modale d'export — centrage framer-motion
**Problème :** `framer-motion` possède le CSS `transform`. Si le `motion.div` a aussi `style={{ transform: 'translate(-50%, -50%)' }}`, framer-motion écrase le translate au premier render → la modale se retrouve en bas à droite.

**Solution validée :** deux niveaux imbriqués :
```tsx
{/* Wrapper statique — positionne via flexbox, jamais de transform */}
<div style={{ position: 'fixed', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              zIndex: 10001, pointerEvents: 'none' }}>
  {/* motion.div — anime uniquement scale/opacity/y */}
  <motion.div
    initial={{ opacity: 0, scale: 0.94, y: 18 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.94, y: 10 }}
    style={{ pointerEvents: 'auto', width: 620, ... }}
  >
    {/* contenu */}
  </motion.div>
</div>
```
- Ne jamais mettre `transform` dans le `style` d'un `motion.div` qui a des variantes `initial/animate`.
- Utiliser `createPortal(…, document.body)` pour sortir du contexte parent.

---

## Export (handleExport dans App.tsx)
- Utiliser **`stage.toDataURL()`** (Konva) — NE PAS recréer un canvas 2D manuellement (produit un fond bleu).
- Clip artboard : `x: transform.x, y: transform.y, width: page.width * scale, height: page.height * scale`
- Resolution : `pixelRatio: 2 / scale` → toujours 2× la résolution artboard, quel que soit le zoom.
- JPEG : compositeur sur canvas blanc avant encodage (JPEG n'a pas de canal alpha).
- PDF : `jsPDF` via import dynamique.
- Appeler `stage.getLayers().forEach(l => l.batchDraw())` avant capture.

---

## Phase 23 — Historique visuel (implémenté)
### Architecture
- `useHistory` (max 15 états) stocke en parallèle `pastSnapshots[]` et gère `currentSnapshot`.
- `push(next, snapshot?)` — snapshot = capture de l'état AVANT push (état allant en `past`).
- `undo() / redo()` déplacent aussi les snapshots de façon symétrique.
- `jumpTo(stepsBack)` restaure un état précis en une seule opération.

### Capture snapshot
```typescript
// Dans App.tsx — avant chaque commit
const snap = captureStageSnapshot()  // toDataURL pixelRatio ≤ 0.15
commit(next, snap)                   // wraps push
```
`captureStageSnapshot` utilise `transformRef.current` (ref, stable) pour les coordonnées clip.

### UI — HistoryDropdown (UndoRedoBar)
- Bouton horloge entre Annuler et Rétablir.
- Dropdown glassmorphism, 200 px de large, max 300 px de hauteur scrollable.
- Vignette = `<img>` 160×90 px, `objectFit: contain`, fond damier pour transparence PNG.
- État actuel en haut avec badge "Actuel".
- Cliquer une vignette → `onJumpTo(stepsBack)` → restaure le design.
- Fermeture : clic extérieur (blur) ou re-clic sur le bouton horloge.

---

## Règles de performance
- `batchDraw()` après chaque restauration d'état (undo/redo/jumpTo).
- `stage.toDataURL()` pour export — jamais de canvas 2D manual redraw.
- Thumbnails historique : `pixelRatio = min(0.15 / scale, 0.5)` pour rester légers.
- Debounce/throttle implicite : les sliders utilisent `liveUpdate` (pas de `push`) pendant le drag.
