const createMockClass = (..._args: unknown[]) => {
  return class {
    constructor(..._args: unknown[]) {}
  };
};

const Phaser = {
  AUTO: 0,
  WEBGL: 1,
  CANVAS: 2,

  BlendModes: {
    ADD: 1,
    NORMAL: 0,
  },

  Game: createMockClass(),
  Scene: createMockClass(),

  Types: {
    Core: {},
    Input: {
      Keyboard: {
        CursorKeys: {},
      },
    },
  },

  GameObjects: {
    Container: createMockClass(),
    Graphics: createMockClass(),
    Text: createMockClass(),
    Particle: {},
    Particles: {
      ParticleEmitter: createMockClass(),
    },
    Bob: createMockClass(),
    Sprite: createMockClass(),
    Image: createMockClass(),
  },

  Physics: {
    Arcade: {
      Sprite: createMockClass(),
      StaticGroup: createMockClass(),
      Body: createMockClass(),
      Collider: createMockClass(),
    },
  },

  Input: {
    Keyboard: {
      KeyCodes: {
        W: 87,
        A: 65,
        S: 83,
        D: 68,
        UP: 38,
        DOWN: 40,
        LEFT: 37,
        RIGHT: 39,
        SPACE: 32,
      },
      Key: createMockClass(),
    },
    Pointer: createMockClass(),
  },

  Tweens: {
    Tween: createMockClass(),
  },

  Time: {
    TimerEvent: createMockClass(),
  },

  Cameras: {
    Scene2D: {
      Camera: createMockClass(),
    },
  },

  Math: {
    Vector2: createMockClass(),
    Between: jest.fn(),
  },

  Display: {
    Align: {},
    Color: {
      GetColor: jest.fn((r: number, g: number, b: number) => (r << 16) | (g << 8) | b),
      IntegerToColor: jest.fn(),
    },
  },

  Animations: {
    Animation: createMockClass(),
  },

  Scenes: {
    ScenePlugin: createMockClass(),
  },

  Scale: {
    ScaleManager: createMockClass(),
  },

  Data: {
    DataManager: createMockClass(),
  },

  Actions: {},
  Cache: {},
  Core: {},
  Events: {},
  Loader: {},
  Structs: {},
  Textures: {},
  Utils: {},
};

export default Phaser;
module.exports = Phaser;
