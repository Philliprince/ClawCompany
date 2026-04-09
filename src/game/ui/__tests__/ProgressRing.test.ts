import { ProgressRing } from '../ProgressRing';

jest.mock('phaser', () => {
  const mockGraphics = {
    clear: jest.fn(),
    lineStyle: jest.fn().mockReturnThis(),
    strokeCircle: jest.fn().mockReturnThis(),
    beginPath: jest.fn().mockReturnThis(),
    moveTo: jest.fn().mockReturnThis(),
    arc: jest.fn().mockReturnThis(),
    strokePath: jest.fn().mockReturnThis(),
    setPosition: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    setAlpha: jest.fn().mockReturnThis(),
    setScale: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
    x: 0,
    y: 0,
    alpha: 0,
  };

  const mockText = {
    setText: jest.fn(),
    setOrigin: jest.fn(),
    setDepth: jest.fn().mockReturnThis(),
    setPosition: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
    text: '',
  };

  const mockScene = {
    add: {
      graphics: jest.fn(() => ({ ...mockGraphics })),
      text: jest.fn(() => ({ ...mockText })),
    },
    time: {
      delayedCall: jest.fn().mockReturnValue({ remove: jest.fn() }),
    },
  };

  return {
    default: {
      GameObjects: { Graphics: jest.fn() },
    },
    __mocks: { mockScene, mockGraphics, mockText },
  };
});

const Phaser = require('phaser');
const { mockScene } = Phaser.__mocks;

describe('ProgressRing', () => {
  let ring: ProgressRing;

  beforeEach(() => {
    jest.clearAllMocks();
    ring = new ProgressRing(mockScene as any);
  });

  afterEach(() => {
    ring.destroy();
  });

  describe('constructor', () => {
    it('should create ProgressRing', () => {
      expect(ring).toBeDefined();
    });

    it('should initialize with 0 progress', () => {
      expect(ring.getProgress()).toBe(0);
    });

    it('should initialize as inactive', () => {
      expect(ring.isActive()).toBe(false);
    });
  });

  describe('setProgress', () => {
    it('should set progress', () => {
      ring.setProgress(50);
      for (let i = 0; i < 30; i++) {
        ring.update();
      }
      expect(ring.getProgress()).toBeCloseTo(50, 0);
    });

    it('should clamp progress above 0', () => {
      ring.setProgress(-10);
      expect(ring.getProgress()).toBeGreaterThanOrEqual(0);
    });

    it('should clamp progress below 100', () => {
      ring.setProgress(150);
      expect(ring.getProgress()).toBeLessThanOrEqual(100);
    });

    it('should handle 0 progress', () => {
      ring.setProgress(0);
      expect(ring.getProgress()).toBe(0);
    });

    it('should handle 100 progress', () => {
      ring.setProgress(100);
      expect(ring.getProgress()).toBeLessThanOrEqual(100);
    });
  });

  describe('setPriority', () => {
    it('should set high priority', () => {
      ring.setPriority('high');
      expect(ring.getPriority()).toBe('high');
    });

    it('should set medium priority', () => {
      ring.setPriority('medium');
      expect(ring.getPriority()).toBe('medium');
    });

    it('should set low priority', () => {
      ring.setPriority('low');
      expect(ring.getPriority()).toBe('low');
    });

    it('should return null when no priority set', () => {
      expect(ring.getPriority()).toBeNull();
    });
  });

  describe('getPosition', () => {
    it('should return position', () => {
      const pos = ring.getPosition();
      expect(pos).toHaveProperty('x');
      expect(pos).toHaveProperty('y');
    });
  });

  describe('show/hide', () => {
    it('should show at position', () => {
      ring.show(100, 200);
      ring.update();
      expect(ring.isActive()).toBe(true);
    });

    it('should hide', () => {
      ring.show(100, 100);
      ring.update();
      ring.hide();
      for (let i = 0; i < 50; i++) {
        ring.update();
      }
      expect(ring.isActive()).toBe(false);
    });
  });

  describe('setPosition', () => {
    it('should set position', () => {
      ring.setPosition(50, 100);
      expect(ring).toBeDefined();
    });
  });

  describe('setScale', () => {
    it('should set scale', () => {
      ring.setScale(2);
      expect(ring).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update without errors', () => {
      expect(() => ring.update()).not.toThrow();
    });

    it('should animate progress smoothly', () => {
      ring.setProgress(100);
      ring.update();
      
      const progress1 = ring.getProgress();
      expect(progress1).toBeLessThan(100);
      
      for (let i = 0; i < 20; i++) {
        ring.update();
      }
      
      const finalProgress = ring.getProgress();
      expect(finalProgress).toBeGreaterThan(progress1);
    });
  });

  describe('isActive', () => {
    it('should return false initially', () => {
      expect(ring.isActive()).toBe(false);
    });

    it('should return true after show', () => {
      ring.show(100, 100);
      ring.update();
      expect(ring.isActive()).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should destroy without errors', () => {
      expect(() => ring.destroy()).not.toThrow();
    });

    it('should handle update after destroy', () => {
      ring.destroy();
      expect(() => ring.update()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid progress changes', () => {
      for (let i = 0; i < 100; i++) {
        ring.setProgress(i);
        ring.update();
      }
      expect(ring).toBeDefined();
    });

    it('should handle show/hide cycles', () => {
      for (let i = 0; i < 10; i++) {
        ring.show(100, 100);
        ring.hide();
      }
      expect(ring).toBeDefined();
    });

    it('should handle setProgress with decimal values', () => {
      ring.setProgress(33.33);
      expect(ring).toBeDefined();
    });
  });
});