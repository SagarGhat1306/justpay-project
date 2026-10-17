# Scratch Studio — React Native (Expo Go)

The same Scratch-style visual coding app as the React (web) version, rebuilt for phones and
tablets with React Native + Expo SDK 57 (`expo@57.0.9`). It runs in **Expo Go** (no native build needed).

Drag puzzle-piece blocks into a script, nest them in Repeat loops, give every sprite its own
program, press **Play**, and watch them animate. When two sprites collide, their movement
instructions swap (the mandatory Hero feature).

## Run it on your phone

```bash
npm install
npx expo start          # scan the QR code with Expo Go (Android) or the Camera app (iOS)
```

Requirements: Node 20+ and an **Expo Go** app that supports SDK 57 from the App Store / Play Store.
Phone and computer must be on the same Wi-Fi (or use `npx expo start --tunnel`).

Other commands:

```bash
npm run lint            # expo lint (ESLint + React Compiler rules) — 0 problems
npx expo export --platform android   # production JS bundle (Hermes)
npx expo export --platform ios
```

## Using the app

| Action | How |
|---|---|
| Add a block | **Phone:** drag a block *down* out of the palette strip (swipe sideways to scroll it), or tap it to append. **Tablet:** drag it sideways out of the palette, or tap. |
| Nest a block | Drop it inside a Repeat's mouth; a grey silhouette shows exactly where it will snap. Dropping on the upper half of a Repeat's bottom bar puts it inside at the end. |
| Move a script block | Long-press it (about ¼ s), then drag. Normal swipes still scroll the script. |
| Block options | Tap a block: ↑ / ↓ / 🗑 buttons appear. |
| Delete a block | Long-press-drag it onto the palette ("Drop here to delete"), or tap → 🗑. |
| Edit values | Tap a value bubble and type (number keyboard includes a minus sign). |
| Run | **Play** starts every sprite's script together; **Stop** halts; **Reset** restores positions and the original programs. |
| Sprites | *Stage & sprites* tab: add Cat / Dog / Robot, select, rename, set x / y / direction, drag sprites on the stage, delete. |
| Full-screen stage | ⛶ on the Stage panel. Rotate the phone to landscape for a bigger stage. Exit with the button or Android back. |
| Collision demo | ⚡ on the Sprites panel reloads the Hero example: Cat `repeat forever → move 10`, Dog `repeat forever → move -10`. |

Undo / redo is in the header (tablet) or next to the tabs (phone). Projects auto-save on the
device (AsyncStorage).

### Layouts
- **Phone (< 700 pt):** Code / Stage tabs; horizontal palette strip above the script. Play
  switches to the Stage tab so you can watch.
- **Tablet (700–1023 pt):** palette column beside the script; stage in its own tab.
- **Large tablet / landscape (≥ 1024 pt):** palette | script | stage + sprites, like the web app.

## Architecture

```
App.js                      shell: fonts + saved project load, layouts, tabs, drop handling
src/
  engine/                   ← pure JS, shared with the web version (unchanged logic)
    blocks.js               block definitions + immutable program-tree helpers
    coords.js               480×360 Scratch coordinates ↔ pixels, fencing, angles
    interpreter.js          async interpreter (move/turn/goTo/say/think/repeat/forever)
    collision.js            AABB detection, edge-triggering, move-steps swap
    runtime.js              Play/Stop/Reset, frame ticker, cancellation, collision checks
  state/                    store (useSyncExternalStore), AsyncStorage autosave, costumes
  dnd/
    hitTest.js              pure drop-target geometry
    registry.js             measures blocks with measureInWindow when a drag starts
    dragStore.js            drag session, auto-scroll near the edges, drop dispatch
  components/
    blocks/shapes.js        puzzle outlines (notch on top, tab below, C-blocks, hat)
    blocks/BlockView.js     SVG puzzle block, editable inputs, snap marker, bump animation
    blocks/DragLayer.js     ghost block that follows the finger
    Palette.js, Workspace.js, PreviewArea.js, Header.js
    stage/Stage.js          scaled stage, sprites, speech/thought bubbles, swap toast
    stage/FullscreenStage.js  Modal, largest 4:3 stage, own Play/Stop/Reset
```

**Libraries (all included in Expo Go):** react-native-gesture-handler v2 (builder API:
`Gesture.Pan()`, `Gesture.Tap()`, `Gesture.Race()` with `runOnJS(true)`), react-native-svg, @react-native-async-storage/async-storage,
react-native-safe-area-context, expo-haptics, expo-font + Inter. No Reanimated or worklets
needed: gesture callbacks run on the JS thread, and the stage is light.

### How touch drag-and-drop works
Phones have no `elementFromPoint`, so when a drag starts every script block's header, Repeat
mouth and foot are measured once (`measureInWindow`). `hitTest.js` turns the finger position
into a target (list + index) using those rects, adjusted for auto-scroll. Because the
measurements are a snapshot, inserting the grey snap marker never makes the target jump.
Haptics fire on pick-up, snap and delete.

### Puzzle pieces
Each block measures its header row (and Repeat mouth) with `onLayout`, and `shapes.js` draws
the matching SVG outline. The notch is cut into the top edge and the tab sits on the bottom
edge at the same x. Blocks stack with zero gap, so each tab fills the notch of the block
below. A Repeat has a tab under its arm and a notch on its foot for the nested stack.

### Interpreter and collision swap (same as the web version)
One `requestAnimationFrame` ticker drives every sprite in lock-step. Each Play gets a run
token; Stop cancels it and rejects pending frame waits, so stale runs can't touch the stage.
Collisions use AABB checks each frame and fire only when a pair *starts* touching. The
`move` blocks of both programs then exchange their `steps` values, in visual order and
including moves nested in loops. The running loops pick the new value up on their next move,
and the editor shows it. Reset reverts the swaps; autosave always stores the original programs.

## Verification done
- `npm run lint`: **0 problems**.
- `expo export` for **Android and iOS**: both bundle to Hermes bytecode without errors.
- `expo-doctor`: the only warnings are patch mismatches from pinning `expo` to exactly 57.0.9
  (it suggests 57.0.30 and react-native 0.86.3).

Not verified here: running inside the Expo Go app on a physical phone. Do that with
`npx expo start` (see the checklist below).

## Check on a real phone before submitting
1. Drag **Move**, **Turn**, **Say** and **Repeat** into the script and press Play.
2. Give Cat and Dog different programs; Play starts both.
3. Load the **Collision demo** and press Play: they walk toward each other, the "1 swap"
   toast appears, Cat's script shows `move -10`, and they walk apart.
