import Phaser from 'phaser';
import { PHYSICS_CONFIG } from '../config/gameConfig';
import { AnimationController, AnimationState } from '../systems/AnimationController';

export class AgentCharacter extends Phaser.Physics.Arcade.Sprite {
  private isOnFloor: boolean = false;
  private animationController!: AnimationController;
  private color: number;
  private isWorking: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number,
    color: number = 0xffffff
  ) {
    super(scene, x, y, texture, frame);

    this.color = color;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setBounce(0);
    this.setDrag(PHYSICS_CONFIG.drag, 0);
  }

  setAnimationController(controller: AnimationController): void {
    this.animationController = controller;
  }

  update(): void {
    if (this.animationController) {
      const velocityX = this.body?.velocity.x || 0;
      const velocityY = this.body?.velocity.y || 0;
      this.animationController.update(
        velocityX,
        velocityY,
        this.getOnFloor(),
        this.isWorking
      );
    }
  }

  getOnFloor(): boolean {
    return this.body?.blocked.down || this.body?.touching.down || false;
  }

  setWorking(working: boolean): void {
    this.isWorking = working;
  }

  isWorkingState(): boolean {
    return this.isWorking;
  }
}

export function createAgent(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number
): AgentCharacter {
  const graphics = scene.add.graphics();
  graphics.fillStyle(color, 1);
  graphics.fillRect(-16, -32, 32, 32);
  graphics.generateTexture('agent_' + color, 32, 32);
  graphics.destroy();

  return new AgentCharacter(scene, x, y, 'agent_' + color, undefined, color);
}
