import Phaser from 'phaser';
import MainScene from '../scenes/MainScene';

export default class Game extends Phaser.Game {
    constructor() {
        super({
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight,
            pixelArt: true,
            physics: { default: 'arcade', arcade: { debug: false } },
            scene: [MainScene]
        });
    }
}