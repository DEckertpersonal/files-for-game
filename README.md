Below is an **updated, complete PRD (plain text)** that **incorporates all requested edits**, replaces the earlier scoring model, adds **multiple randomized animations**, adds **audio behavior**, and **explicitly uses the asset file names contained in the attached `assets.zip`**.

This document is designed to be copied directly into a `.txt` file and used with **AI coding tools**.

---

# PRODUCT REQUIREMENTS DOCUMENT

## 67 Endless Runner (Web / Three.js)

---

## 1. Product Overview

**Product Name:** 67 Endless Runner
**Platform:** Web (Desktop & Mobile Browsers)
**Technology Stack:**

* Three.js (ES Modules, no build step)
* HTML / CSS / Vanilla JavaScript
* GLTFLoader
* Web Audio API / Three.js Audio
* Static HTTP server (e.g. `python3 -m http.server`)

**Target Audience:**
Kids and casual players

**Goal:**
Create a polished, kid-friendly 3D endless runner where players collect coins for points, receive clear visual and audio feedback, enjoy randomized character animations, and always restart from a clean Start Page.

---

## 2. Core Gameplay Loop

### 2.1 Start Page

* First screen shown on page load
* Solid white background
* One centered button:

  * **“Start 67 Game”**

**On Click**

1. Hide Start Page
2. Show countdown
3. Begin gameplay after countdown

---

### 2.2 Countdown

* Fullscreen overlay
* Displays: `3 → 2 → 1`
* Each number ~1 second
* Player input disabled

**Audio behavior**

* Background music **fades in**
* Music starts **exactly when countdown transitions from 3 → 2**

---

## 3. Player (Runner)

### 3.1 Models & Animations

All animations are provided as **separate GLB files** and must be loaded and managed individually.

#### Running Animations (1)

* `runner_run.glb`

#### Jump Animations (5 total, randomized)

* `runner_jump_01.glb`
* `runner_jump_02.glb`
* `runner_jump_03.glb`
* `runner_jump_04.glb`
* `runner_jump_05.glb`

When the player jumps:

* Randomly select **one** jump animation
* Crossfade from run → selected jump → run

#### Fall / Knockdown Animations (4 total, randomized)

* `runner_fall_01.glb`
* `runner_fall_02.glb`
* `runner_fall_03.glb`
* `runner_fall_04.glb`

When the player hits a red block:

* Randomly select **one** fall animation
* Crossfade from run → selected fall animation

---

### 3.2 Orientation & Camera

* Runner faces **away from camera**
* Camera is behind and slightly above runner
* Smooth chase camera
* Runner stays near Z = 0

---

### 3.3 Controls

**Desktop**

* Left Arrow → move left
* Right Arrow → move right
* Space → jump

**Mobile**

* Swipe left/right → change lanes
* Swipe up → jump

---

## 4. Environment

* 3 fixed lanes
* Endless runner illusion
* World moves toward camera
* Runner remains mostly stationary in Z

---

## 5. Obstacles (Red Blocks)

* Red cube meshes
* Spawn in lanes
* Move toward runner
* Collision ends run

---

## 6. Coin System (“67 Coins”)

### 6.1 Coin Types

| Type              | Spawn % | Points | Model                          |
| ----------------- | ------- | ------ | ------------------------------ |
| Type 1 – Ground   | ~80%    | +67    | `coin-type-1-silver-coin.glb`  |
| Type 2 – Jump     | ~15%    | +134   | `coin_gold.glb`                |
| Type 3 – Advanced | ~5%     | +334   | `coin-type-3-diamond-coin.glb` |

### 6.2 Placement Rules

* Jump & Advanced coins spawn ~40% higher than ground coins
* Hitboxes are forgiving
* Advanced coins may appear above red blocks

---

## 7. Coin Collection Feedback

On coin collection:

1. Coin disappears
2. Rainbow particle burst at coin position
3. Floating text:

   * `+67`, `+134`, or `+334`
4. Score updates immediately
5. Sound effect (see Audio section)

---

## 8. Scoring System (UPDATED)

### 8.1 Scoring Rules

* **NO passive survival points**
* Total score is **only** the sum of collected coins

### 8.2 HUD Layout (Top Left)

**Total Score**

* Large numeric value (sum of all coins)

**Below total score**

* Three coin icons with counters:

| Coin Type     | Icon File              |
| ------------- | ---------------------- |
| Ground Coin   | `coin-ui-ground.png`   |
| Jump Coin     | `coin-ui-jump.png`     |
| Advanced Coin | `coin-ui-advanced.png` |

Each icon displays:

* Count of coins collected of that type

---

## 9. Audio System (NEW)

### 9.1 Background Music

* File: `game-sounds.mp3`
* Starts during countdown at **3 → 2**
* Fades in smoothly
* Loops during gameplay
* Stops on Game Over

### 9.2 Coin Sound Effects

* File: `67-advanced-coin-audio.mp3`
* Plays when collecting:

  * Type 2 – Jump coins
  * Type 3 – Advanced coins
* Does NOT play for Type 1 ground coins

---

## 10. Game Over Flow

1. Collision with red block
2. Stop gameplay logic
3. Play random fall animation
4. Wait ~1–1.5 seconds
5. Return to Start Page
6. Reset all game state

---

## 11. Control Panel / Tuning System

### New File: `config.js`

Acts as the **single source of truth** for:

* Object sizes (runner, coins, obstacles)
* Coin heights
* Speed & jump physics
* Spawn frequencies
* Firework size
* Animation timing
* Audio volume

### Optional UI

* Toggle with `P`
* Sliders & numeric inputs
* Reset to defaults
* Copy/paste JSON
* Optional localStorage persistence

---

## 12. Folder Structure (UPDATED WITH ASSETS)

```
/ (project root)
│
├── index.html
├── main.js
├── config.js
├── README.md
│
└── assets/
    ├── runner_run.glb
    ├── runner_jump_01.glb
    ├── runner_jump_02.glb
    ├── runner_jump_03.glb
    ├── runner_jump_04.glb
    ├── runner_jump_05.glb
    ├── runner_fall_01.glb
    ├── runner_fall_02.glb
    ├── runner_fall_03.glb
    ├── runner_fall_04.glb
    │
    ├── coin-type-1-silver-coin.glb
    ├── coin_gold.glb
    ├── coin-type-3-diamond-coin.glb
    │
    ├── coin-ui-ground.png
    ├── coin-ui-jump.png
    ├── coin-ui-advanced.png
    │
    ├── game-sounds.mp3
    ├── 67-advanced-coin-audio.mp3
```

---

## 13. Technical Rules

* ES modules only
* No build tools
* All tuning via `config.js`
* Assets loaded once and cloned
* Object pooling for coins/obstacles
* Mobile-safe performance

---

## 14. Acceptance Criteria

* Score only comes from coins
* HUD shows total score + per-coin counts
* Animations are randomized
* Audio triggers correctly
* Game always resets fully
* Start Page always loads first
* Works on desktop & mobile

---

## 15. Out of Scope

* Multiplayer
* Backend
* Ads or monetization
* Accounts/login

---

**END OF PRD**


