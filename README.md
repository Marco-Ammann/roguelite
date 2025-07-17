# Roguelite Prototype

A minimalist, **self-generated-art** roguelite built with [Phaser 3](https://phaser.io/) and TypeScript. 100% of graphics are produced procedurally at runtime – no external assets.

## ✅ Current Status (Phase 2.2 Complete)

### **Phase 1 Features (Stable):**
- ✅ **Player Movement** - WASD/Arrow keys with direction-aware sprites
- ✅ **Basic Shooting** - Space bar shooting with reliable projectiles
- ✅ **Enemy AI** - Standard/Elite ranks with pursuit behavior  
- ✅ **Wave System** - Configurable enemy spawning with progression
- ✅ **Health System** - Player/Enemy HP with visual health bars
- ✅ **Collision Detection** - Type-safe modular collision system
- ✅ **Debug Tools** - F1 overlay, F2 collision debug, clean logging

### **Phase 2 Features (New):**
- ✅ **Modular CollisionService** - Extracted from MainScene (120 lines vs 200)
- ✅ **WeaponSystem** - Q key weapon switching with visual feedback
- ✅ **Pierce Damage** - Yellow projectiles hit multiple enemies
- ✅ **Explosive Damage** - Orange projectiles with AOE explosion effects
- ✅ **Event-driven Architecture** - Services communicate via events

### **Known Issues (Phase 2.2):**
- ⚠️ **Pierce Multi-Hit Bug** - Pierce projectiles may hit same enemy multiple times
- ⚠️ **Explosive Targeting** - AOE may not hit all nearby enemies consistently

## 🎮 Controls

| Action | Key | Description |
|--------|-----|-------------|
| Move | WASD / Arrow Keys | 8-directional movement |
| Shoot | Space (hold) | Continuous shooting |
| Switch Weapon | Q | Cycle: Normal → Pierce → Explosive |
| Next Wave | N | Manual wave progression |
| Debug Overlay | F1 | Performance info (FPS, HP, entities) |
| Collision Debug | F2 | Collision stats + visual feedback |

## 🔫 Weapon Types

### **Normal (White)**
- **Type**: Standard projectile
- **Behavior**: Destroyed on first enemy hit
- **Fire Rate**: 250ms
- **Damage**: 1

### **Pierce (Yellow)**  
- **Type**: Penetrating projectile
- **Behavior**: Hits up to 3 enemies before destruction
- **Fire Rate**: 400ms  
- **Damage**: 1 per hit

### **Explosive (Orange)**
- **Type**: AOE projectile
- **Behavior**: Explodes on impact, 60px radius damage
- **Fire Rate**: 800ms
- **Damage**: 2 (AOE)

## 🏗️ Architecture (Clean Code)

```
src/
├── config/
│   └── GameConfig.ts          # Central configuration
├── services/
│   ├── EnemySpawnService.ts   # Wave-based spawning
│   └── CollisionService.ts    # Modular collision management
├── systems/
│   └── WeaponSystem.ts        # Weapon switching + projectile creation
├── entities/
│   ├── Player.ts              # Player with weapon system
│   ├── Enemy.ts               # AI-driven enemies with unique IDs
│   ├── Projectile.ts          # Base projectile class
│   ├── PierceProjectile.ts    # Multi-hit projectiles
│   └── ExplosiveProjectile.ts # AOE damage projectiles
├── scenes/
│   └── MainScene.ts           # Game loop (120 lines, was 200)
├── gfx/
│   └── TextureGenerator.ts    # Procedural sprites
├── ui/
│   ├── HealthBar.ts           # Visual health display
│   ├── DebugOverlay.ts        # Development tools
│   ├── CollisionDebugOverlay.ts # Collision debugging
│   └── WeaponDisplay.ts       # Current weapon UI
└── interfaces/
    ├── IDamageable.ts         # Damage system contracts
    └── ICollisionSystem.ts    # Type-safe collision interfaces
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

### **Combat System**
- **Projectiles**: 300 px/s speed, type-specific damage
- **Player**: 10 HP, 500ms invincibility after hit
- **Enemies**: Unique IDs for pierce tracking, varying HP

## 🔧 Technical Implementation

### **Clean Code Principles Applied:**
- **Single Responsibility**: Each service has one clear purpose
- **Open/Closed**: Event-driven system allows extension without modification
- **Interface Segregation**: Type-safe contracts for all systems
- **Dependency Inversion**: Services depend on interfaces, not implementations

### **Performance Optimizations:**
- **Entity Pooling**: Ready for implementation
- **Collision Filtering**: Type-safe collision detection
- **Memory Management**: Auto-cleanup systems
- **Event-driven Communication**: Loose coupling between systems

## 🧪 Development & Testing

### **Debug Tools:**
- **F1**: Main debug overlay (FPS, HP, entity counts)
- **F2**: Collision debug (hit statistics, visual feedback)
- **Console Logs**: Structured logging with anti-spam protection

### **Known Technical Debt:**
- Pierce collision detection needs frame-based filtering
- Explosive AOE requires physics query optimization
- Enemy AI could benefit from state machine pattern

## 🎯 Next Development Phases

### **Phase 3: Advanced Combat (Ready)**
- **Boss Enemies**: Multi-phase boss encounters
- **Status Effects**: Burn, Freeze, Slow, Poison
- **Player Abilities**: Shield, Dash, Time Slow
- **Upgrade System**: Weapon modifications

### **Phase 4: Progression System**
- **Experience/Leveling**: Vampire Survivors style progression
- **Skill Trees**: Character-specific abilities
- **Meta-progression**: Persistent upgrades
- **Multiple Characters**: Different starting weapons

### **Inspiration Sources:**
- **Vampire Survivors**: Auto-aim, weapon evolution
- **Babbel (Tower of Babel)**: 6-slot skill system, character variety
- **Roguelite Genre**: Procedural progression, meta-upgrades

## 📊 Performance Metrics

- **Target FPS**: 60
- **Memory Usage**: Auto-cleanup prevents leaks
- **Entity Limit**: 100+ concurrent entities tested
- **Code Quality**: TypeScript strict mode, 0 warnings

## 📄 License

MIT – Free to use and modify.

---

**Total Development Time**: Phase 1 (8 hours) + Phase 2 (6 hours) = 14 hours
**Code Quality**: Clean Code principles, SOLID design patterns, type-safe architecture
**Next Session Ready**: Phase 3 planning document prepared