import Phaser from 'phaser';
import { AgentCharacter, createAgent } from '../characters/AgentCharacter';
import { PHYSICS_CONFIG, TILE_SIZE } from '../config/gameConfig';
import { DebugOverlay } from '../utils/DebugOverlay';
import { MovementSystem } from '../systems/MovementSystem';
import { AnimationController } from '../systems/AnimationController';
import { CharacterSprites, createCharacterSprites } from '../sprites/CharacterSprites';

interface Workstation {
  id: string;
  x: number;
  y: number;
  label: string;
  status: 'idle' | 'busy';
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
}

interface TilemapData {
  width: number;
  height: number;
  tileSize: number;
  workstations: Workstation[];
  platforms: Platform[];
}

export class OfficeScene extends Phaser.Scene {
  private agents: AgentCharacter[] = [];
  private platforms: Phaser.Physics.Arcade.StaticGroup;
  private debugOverlay!: DebugOverlay;
  private movementSystem!: MovementSystem;
  private tilemapData: TilemapData | null = null;
  private workstationMap: Map<string, Workstation> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private particles!: any;

  constructor() {
    super({ key: 'OfficeScene' });
    this.platforms = this.physics.add.staticGroup();
  }

  async preload(): Promise<void> {
    this.createParticleTexture();

    try {
      const response = await fetch('/assets/office-tilemap.json');
      this.tilemapData = await response.json();
    } catch (error) {
      console.warn('Failed to load tilemap, using defaults');
      this.tilemapData = {
        width: 20,
        height: 15,
        tileSize: 32,
        workstations: [
          { id: 'ws1', x: 4, y: 8, label: 'Dev1', status: 'idle' },
          { id: 'ws2', x: 8, y: 8, label: 'Dev2', status: 'idle' },
          { id: 'ws3', x: 12, y: 8, label: 'PM', status: 'idle' },
          { id: 'ws4', x: 16, y: 8, label: 'Review', status: 'idle' },
        ],
        platforms: [
          { x: 0, y: 14, width: 20, height: 1, type: 'floor' },
          { x: 0, y: 0, width: 1, height: 14, type: 'wall_left' },
          { x: 19, y: 0, width: 1, height: 14, type: 'wall_right' },
          { x: 2, y: 9, width: 4, height: 0.5, type: 'desk' },
          { x: 6, y: 9, width: 4, height: 0.5, type: 'desk' },
          { x: 10, y: 9, width: 4, height: 0.5, type: 'desk' },
          { x: 14, y: 9, width: 4, height: 0.5, type: 'desk' },
        ],
      };
    }
  }

  private createParticleTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x00ff00, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('particle', 8, 8);
    graphics.destroy();
  }

  create(): void {
    this.particles = this.add.particles(0, 0, 'particle', {
      speed: { min: 20, max: 50 },
      scale: { start: 0.4, end: 0 },
      lifespan: 600,
      blendMode: 'ADD',
      frequency: -1,
      emitting: false,
    });
    this.createPlatforms();
    this.createAgents();
    this.setupCollisions();
    this.setupDebug();
    this.setupWorkstationStatus();
    this.movementSystem = new MovementSystem(this);
    if (this.agents.length > 0) {
      this.movementSystem.setActiveAgent(this.agents[0]);
    }
    this.setupKeyboard();
  }

  private setupKeyboard(): void {
    this.input.keyboard!.on('keydown-SPACE', () => {
      this.toggleActiveAgentWork();
    });
  }

  private toggleActiveAgentWork(): void {
    if (!this.movementSystem) return;
    const agent = this.agents[0];
    if (!agent) return;

    const isWorking = !agent.isWorkingState();
    agent.setWorking(isWorking);

    if (isWorking) {
      this.particles.emitParticleAt(agent.x, agent.y - 20, 10);
    }
  }

  private createPlatforms(): void {
    if (!this.tilemapData) return;

    const platformColors: Record<string, number> = {
      floor: 0x888888,
      wall_left: 0x666666,
      wall_right: 0x666666,
      desk: 0x4a3728,
    };

    this.tilemapData.platforms.forEach((platform) => {
      const x = platform.x * TILE_SIZE + (platform.width * TILE_SIZE) / 2;
      const y = platform.y * TILE_SIZE + (platform.height * TILE_SIZE) / 2;
      const width = platform.width * TILE_SIZE;
      const height = platform.height * TILE_SIZE;

      const graphics = this.add.graphics();
      graphics.fillStyle(platformColors[platform.type] || 0x888888, 1);
      graphics.fillRect(-width / 2, -height / 2, width, height);
      graphics.generateTexture(`platform_${platform.type}`, width, height);
      graphics.destroy();

      const platformSprite = this.platforms.create(x, y, `platform_${platform.type}`);
      platformSprite.setOrigin(0.5, 0.5);
      platformSprite.refreshBody();
    });
  }

  private createAgents(): void {
    if (!this.tilemapData) return;

    const agentColors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4];

    this.tilemapData.workstations.forEach((ws, index) => {
      const color = agentColors[index];
      createCharacterSprites(this, color);

      const x = ws.x * TILE_SIZE + TILE_SIZE / 2;
      const y = (ws.y - 1) * TILE_SIZE;
      const agent = createAgent(this, x, y, color);

      const controller = new AnimationController(agent, color);
      agent.setAnimationController(controller);

      this.agents.push(agent);
      this.workstationMap.set(ws.id, ws);
    });
  }

  private setupWorkstationStatus(): void {
    this.time.addEvent({
      delay: 3000,
      callback: () => {
        this.tilemapData?.workstations.forEach((ws) => {
          if (Math.random() > 0.7) {
            ws.status = ws.status === 'idle' ? 'busy' : 'idle';
            const agentIndex = this.tilemapData!.workstations.findIndex(w => w.id === ws.id);
            if (agentIndex >= 0 && this.agents[agentIndex]) {
              this.agents[agentIndex].setWorking(ws.status === 'busy');
            }
          }
        });
      },
      loop: true,
    });
  }

  private setupCollisions(): void {
    this.agents.forEach((agent) => {
      this.physics.add.collider(agent, this.platforms);
    });
  }

  private setupDebug(): void {
    this.debugOverlay = new DebugOverlay(this);
  }

  update(): void {
    this.agents.forEach((agent) => agent.update());
    this.movementSystem.update();
    this.debugOverlay.update(this.agents);
  }

  toggleDebug(): void {
    this.physics.world.drawDebug = !this.physics.world.drawDebug;
  }
}
