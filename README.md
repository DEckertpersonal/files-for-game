# 67 Endless Runner

A Three.js endless runner that uses the provided assets from `files-for-game`. The game runs fully in the browser with no build step.

## Getting Started

```bash
python3 -m http.server 8080
# open http://localhost:8080/
```

## Controls

- **Desktop:** Left/Right arrows to change lanes, Space to jump.
- **Mobile:** Swipe left/right to change lanes, swipe up to jump.
- **Config panel:** Press **P** to toggle the tuning panel.

## Gameplay Flow

1. Start page shows a white screen with the **“Start 67 Game”** button.
2. After clicking, a `3 → 2 → 1` countdown plays; music fades in at **3 → 2**.
3. Run, avoid red blocks, and collect coins for points (score only comes from coins).
4. Collision triggers a randomized fall animation, pauses gameplay, and returns to the start page after ~1–1.5s.

## Assets

All assets are included under `assets/` and loaded via relative paths. Replace assets by keeping the same file names and folder structure.
