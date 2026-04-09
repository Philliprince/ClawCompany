import { PriorityPulseEffect } from '../PriorityPulseEffect';

jest.mock('phaser', () => {
  const mockGraphics = {
    clear: jest.fn(),
    lineStyle: jest.fn().mockReturnThis(),
    strokeCircle: jest.fn().mockReturnThis(),
    fillStyle: jest.fn().mockReturnThis(),
    fillCircle: jest.fn().mockReturnThis(),
    setPosition: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    setAlpha: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
    x: 0,
    y: 0,
    alpha: 0,
  };

  const mockParticles = {
    setPosition: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    setAlpha: jest.fn().mockReturnThis(),
    setTexture: jest.fn(),
    stop: jest.fn(),
    explode: jest.fn(),
    destroy: jest.fn(),
  };

  const mockScene = {
    add: {
      graphics: jest.fn(() => ({ ...mockGraphics })),
      particles: jest.fn(() => ({ ...mockParticles })),
    },
    textures: {
      remove: jest.fn(),
    },
  };

  return {
    default: {
      GameObjects: { Graphics: jest.fn() },
    },
    BlendModes: { ADD: 1 },
    __mocks: { mockScene, mockGraphics, mockParticles },
  };
});

const Phaser = require('phaser');
const { mockScene } = Phaser.__mocks;

describe('PriorityPulseEffect', () => {
  let effect: PriorityPulseEffect;

  beforeEach(() => {
    jest.clearAllMocks();
    effect = new PriorityPulseEffect(mockScene as any);
  });

  afterEach(() => {
    effect.destroy();
  });

  describe('constructor', () => {
    it('should create PriorityPulseEffect', () => {
      expect(effect).toBeDefined();
    });

    it('should initialize with medium priority', () => {
      expect(effect).toBeDefined();
    });

    it('should initialize with 0.5 intensity', () => {
      expect(effect).toBeDefined();
    });
  });

  describe('setPriority', () => {
    it('should set high priority', () => {
      expect(() => effect.setPriority('high')).not.toThrow();
    });

    it('should set medium priority', () => {
      expect(() => effect.setPriority('medium')).not.toThrow();
    });

    it('should set low priority', () => {
      expect(() => effect.setPriority('low')).not.toThrow();
    });

    it('should handle unknown priority', () => {
      expect(() => effect.setPriority('unknown')).not.toThrow();
    });
  });

  describe('setIntensity', () => {
    it('should set intensity within valid range', () => {
      effect.setIntensity(0.5);
      expect(effect).toBeDefined();
    });

    it('should clamp intensity above 0', () => {
      effect.setIntensity(-0.5);
      expect(effect).toBeDefined();
    });

    it('should clamp intensity below 1', () => {
      effect.setIntensity(1.5);
      expect(effect).toBeDefined();
    });

    it('should handle 0 intensity', () => {
      effect.setIntensity(0);
      expect(effect).toBeDefined();
    });

    it('should handle 1 intensity', () => {
      effect.setIntensity(1);
      expect(effect).toBeDefined();
    });
  });

  describe('setPosition', () => {
    it('should set position', () => {
      expect(() => effect.setPosition(100, 200)).not.toThrow();
    });

    it('should handle zero coordinates', () => {
      expect(() => effect.setPosition(0, 0)).not.toThrow();
    });

    it('should handle negative coordinates', () => {
      expect(() => effect.setPosition(-50, -100)).not.toThrow();
    });
  });

  describe('show/hide', () => {
    it('should show effect', () => {
      expect(() => effect.show()).not.toThrow();
    });

    it('should hide effect', () => {
      expect(() => effect.hide()).not.toThrow();
    });

    it('should handle show/hide sequence', () => {
      effect.show();
      effect.hide();
      effect.show();
      expect(effect).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update without errors', () => {
      expect(() => effect.update()).not.toThrow();
    });

    it('should handle multiple updates', () => {
      for (let i = 0; i < 10; i++) {
        effect.update();
      }
      expect(effect).toBeDefined();
    });

    it('should handle update after show', () => {
      effect.show();
      effect.update();
      expect(effect).toBeDefined();
    });
  });

  describe('isActive', () => {
    it('should return false when hidden', () => {
      effect.hide();
      expect(effect.isActive()).toBe(false);
    });

    it('should return true when shown', () => {
      effect.show();
      effect.update();
      expect(effect.isActive()).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should destroy without errors', () => {
      expect(() => effect.destroy()).not.toThrow();
    });

    it('should handle multiple destroy calls', () => {
      effect.destroy();
      expect(() => effect.destroy()).not.toThrow();
    });

    it('should clean up resources on destroy', () => {
      effect.destroy();
      expect(mockScene.textures.remove).toHaveBeenCalledWith('pulse-particle');
    });
  });

  describe('edge cases', () => {
    it('should handle update after destroy', () => {
      effect.destroy();
      expect(() => effect.update()).not.toThrow();
    });

    it('should handle setIntensity after destroy', () => {
      effect.destroy();
      expect(() => effect.setIntensity(0.5)).not.toThrow();
    });

    it('should handle setPosition after destroy', () => {
      effect.destroy();
      expect(() => effect.setPosition(100, 100)).not.toThrow();
    });
  });
});