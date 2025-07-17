# Roguelite Prototype

A minimalist, **self-generated-art** roguelite built with [Phaser 3](https://phaser.io/) and TypeScript. 100% of graphics are produced procedurally at runtime – no external assets.

## ✅ Current Status (Phase 1 Complete)

### **Features Implemented:**
- ✅ **Player Movement** - WASD/Arrow keys with direction-aware sprites
- ✅ **Shooting System** - Space bar shooting with reliable projectiles
- ✅ **Enemy AI** - Standard/Elite ranks with pursuit behavior
- ✅ **Wave System** - Configurable enemy spawning with progression
- ✅ **Health System** - Player/Enemy HP with visual health bars
- ✅ **Collision Detection** - Bullets vs Enemies, Enemies vs Player
- ✅ **Debug Tools** - F1 overlay showing FPS, HP, entity counts
- ✅ **Modular Architecture** - Clean services and entity systems

### **Technical Stack:**
- **Engine**: Phaser 3.90.0
- **Language**: TypeScript 5.8.3 (Strict Mode)
- **Build**: Vite 7.0.4
- **Architecture**: Clean Code, Single Responsibility Principle

## 🎮 Controls

| Action | Key | Description |
|--------|-----|-------------|
| Move | WASD / Arrow Keys | 8-directional movement |
| Shoot | Space (hold) | Continuous shooting |
| Next Wave | N | Manual wave progression |
| Debug Overlay | F1 | Toggle performance info |

## 🏗️ Project Structure

```
src/
├── config/
│   └── GameConfig.ts          # ✅ Central configuration
├── services/
│   └── EnemySpawnService.ts   # ✅ Wave-based spawning
├── entities/
│   ├── Player.ts              # ✅ Player with reliable input
│   ├── Enemy.ts               # ✅ AI-driven enemies
│   └── Projectile.ts          # ✅ Physics-based bullets
├── factories/
│   └── EntityFactory.ts      # ✅ Entity creation
├── scenes/
│   └── MainScene.ts           # ✅ Game loop with collision
├── gfx/
│   └── TextureGenerator.ts   # ✅ Procedural sprites
├── ui/
│   ├── HealthBar.ts          # ✅ Visual health display
│   └── DebugOverlay.ts       # ✅ Development tools
└── interfaces/
    └── IDamageable.ts        # ✅ Damage system contracts
```

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production  
npm run build
```

## 🎯 Game Mechanics

### **Wave System**
- **Wave 1**: 3 Standard enemies
- **Wave 2**: 4 Standard + 1 Elite (faster)
- **Wave 3**: 6 Standard + 2 Elite
- **Endless Mode**: Scales infinitely

### **Enemy Types**
- **Standard** (Red): Basic pursuit AI, 5 HP
- **Elite** (Purple): Faster movement, 8 HP  
- **Boss** (Amber): *Coming in Phase 3*

### **Combat**
- **Projectiles**: 300 px/s speed, 1 damage
- **Player**: 10 HP, 500ms invincibility after hit
- **Enemies**: Varying HP, collision damage

## 🔧 Configuration

All game settings are in `src/config/GameConfig.ts`:

```typescript
export const GameConfig = {
  PLAYER: {
    SPEED: 150,
    MAX_HP: 10,
    FIRE_DELAY: 250,  // ms between shots
  },
  ENEMY: {
    STANDARD: { SPEED: 40, HP: 5 },
    ELITE: { SPEED: 50, HP: 8 },
  },
  // ... more settings
};
```

## 🧪 Development Notes

### **Phase 1 Achievements:**
- ✅ Reliable input system (no more shooting inconsistency)
- ✅ Proper physics projectiles (bullets fly correctly)
- ✅ Anti-spam logging (clean console output)
- ✅ Modular spawn service (easy wave configuration)
- ✅ Type-safe collision system

### **Known Issues Fixed:**
- ❌ ~~Projectiles not moving~~ → ✅ Physics timing resolved
- ❌ ~~Inconsistent shooting~~ → ✅ Input system simplified  
- ❌ ~~Logger spam~~ → ✅ Frame-limited checking

## 🎯 Next Phase: Collision System Enhancement

**Ready for Phase 2:**
- 🎯 Modular CollisionService
- 🎯 Multiple damage types
- 🎯 Health/Armor system
- 🎯 Effect system (knockback, status effects)

## 📊 Performance

- **Target FPS**: 60
- **Entity Pooling**: Ready for implementation
- **Memory Management**: Auto-cleanup systems
- **Debug Tools**: Real-time performance monitoring

## 🎮 Inspiration

Taking inspiration from **Vampire Survivors** and **Babbel (Tower of Babel: Survivors of Chaos)** for future weapon/skill systems.

## 📄 License

MIT – Free to use and modify.