import Phaser from 'phaser';
import { createTextures } from '../ui/textures';

/** 모든 텍스처를 코드로 만들어 두고 곧바로 메뉴로 넘어간다. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    createTextures(this);
    this.scene.start('Menu');
  }
}
