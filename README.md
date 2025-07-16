# Roguelite Prototype

A minimalist, **self-generated-art** roguelite built with [Phaser 3](https://phaser.io/) and TypeScript. 100 % of graphics are produced procedurally at runtime – no external assets.

## Features

* WASD / Arrow-key movement with direction-aware sprite art
* Space-bar blaster (bullets damage enemies)
* Enemy ranks (Standard, Elite, *Boss* – coming soon) with health bars
* Dynamic health UI and on-hit feedback
* In-engine debug overlay (toggle **F1**) showing FPS, HP, active enemies & bullets
* Robust `Logger` with global uncaught-error banner
* Modular, factory-based entity creation; easily extend with new enemy behaviours

## Controls

| Action | Key |
| ------ | --- |
| Move   | Arrow Keys / WASD |
| Shoot  | Space |
| Toggle Debug Overlay | F1 |
| Reload (dev hot-reload) | `npm run dev` via Vite |

## Getting started

```bash
# install dependencies
npm install

# start Vite watcher + live-reload server
npm run dev
```

Open `http://localhost:5173` (default Vite port) – the game canvas will load automatically.

Production build:

```bash
npm run build
```

## Project structure

```
src/
  core/            // Game bootstrapping (Phaser config, scenes)
  entities/        // Player, Enemy, Projectile classes
  factories/       // EntityFactory – helpers to instantiate entities
  gfx/             // Procedural TextureGenerator
  scenes/          // MainScene (gameplay loop)
  ui/              // HealthBar, DebugOverlay, etc.
  utils/           // Logger, global error handler
```

### Extending the game

* **Add a new enemy behaviour** – derive a class from `Enemy` or add strategy logic, then plug it into `EntityFactory`.
* **Modify visuals** – tweak `TextureGenerator` pixel-drawing code; every sprite is generated via `Phaser.GameObjects.Graphics`.
* **Create weapons** – implement a new `Projectile` variant, register collision overlap in `MainScene`.

## License

MIT – free to tinker with.
