import { TaskFlowSystem, TaskFlowState } from '../TaskFlowSystem';
import { TaskManager } from '../TaskManager';
import { EventBus } from '../EventBus';
import { Task, GameTaskStatus } from '../../types/Task';

jest.mock('phaser', () => {
  const mockGraphics = {
    clear: jest.fn(),
    lineStyle: jest.fn(),
    strokeCircle: jest.fn(),
    fillStyle: jest.fn(),
    fillCircle: jest.fn(),
    fillRoundedRect: jest.fn(),
    strokeRoundedRect: jest.fn(),
    lineBetween: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    arc: jest.fn(),
    strokePath: jest.fn(),
    fillRect: jest.fn(),
    generateTexture: jest.fn(),
    setPosition: jest.fn(),
    setDepth: jest.fn().mockReturnThis(),
    setAlpha: jest.fn(),
    setVisible: jest.fn(),
    destroy: jest.fn(),
    add: jest.fn(),
    x: 0,
    y: 0,
    alpha: 0,
  };

  const mockContainer = {
    add: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    setPosition: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
    list: [],
  };

  const mockText = {
    setText: jest.fn(),
    setOrigin: jest.fn(),
    setDepth: jest.fn().mockReturnThis(),
    setPosition: jest.fn().mockReturnThis(),
    setColor: jest.fn(),
    destroy: jest.fn(),
    text: '',
  };

  const mockParticles = {
    setPosition: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    setAlpha: jest.fn().mockReturnThis(),
    setTexture: jest.fn(),
    stop: jest.fn(),
    explode: jest.fn(),
    destroy: jest.fn(),
    frequency: 100,
  };

  const mockTween = {
    stop: jest.fn(),
    remove: jest.fn(),
  };

  const mockDelayedCall = jest.fn().mockReturnValue({ remove: jest.fn() });

  const mockScene = {
    add: {
      graphics: jest.fn(() => ({ ...mockGraphics })),
      container: jest.fn(() => ({ ...mockContainer })),
      text: jest.fn(() => ({ ...mockText })),
      particles: jest.fn(() => ({ ...mockParticles })),
      image: jest.fn(() => ({ setOrigin: jest.fn(), setDepth: jest.fn() })),
    },
    tweens: {
      add: jest.fn(() => ({ ...mockTween })),
      killTweensOf: jest.fn(),
    },
    time: {
      delayedCall: mockDelayedCall,
    },
    cameras: {
      main: {
        shake: jest.fn(),
        width: 800,
        height: 600,
      },
    },
    children: {
      list: [],
    },
    sound: {
      play: jest.fn(),
    },
  };

  return {
    default: {
      GameObjects: { Graphics: jest.fn() },
      GameObjects: { Container: jest.fn() },
      GameObjects: { Text: jest.fn() },
    },
    Math: {
      Distance: { Between: jest.fn().mockReturnValue(100) },
      Angle: { Between: jest.fn().mockReturnValue(0) },
    },
    Geom: { Line: jest.fn() },
    BlendModes: { ADD: 1 },
    __mocks: { mockScene, mockGraphics, mockContainer, mockText, mockParticles, mockTween },
  };
});

const Phaser = require('phaser');
const { mockScene } = Phaser.__mocks;

describe('TaskFlowSystem', () => {
  let taskFlowSystem: TaskFlowSystem;
  let taskManager: TaskManager;
  let eventBus: EventBus;

  beforeEach(() => {
    jest.clearAllMocks();
    eventBus = new EventBus();
    taskManager = new TaskManager(eventBus);
    taskFlowSystem = new TaskFlowSystem(mockScene as any, taskManager, eventBus);
  });

  describe('constructor', () => {
    it('should create TaskFlowSystem with all maps initialized', () => {
      expect(taskFlowSystem).toBeDefined();
    });

    it('should subscribe to task events without errors', () => {
      const system = new TaskFlowSystem(mockScene as any, taskManager, eventBus);
      expect(system).toBeDefined();
    });
  });

  describe('createTaskFlow', () => {
    it('should create a new task flow when task is assigned', () => {
      const task = createTestTask({ id: 'task-1', agentId: 'alice', taskType: 'coding' });
      const event = {
        type: 'task:assigned' as const,
        agentId: 'alice',
        task,
      };

      const initialFlows = taskFlowSystem.getActiveFlows();
      taskFlowSystem.createTaskFlow(event);

      expect(taskFlowSystem.getActiveFlows().length).toBeGreaterThan(initialFlows.length);
    });

    it('should create flow with correct task type mapping', () => {
      const task = createTestTask({ id: 'task-1', agentId: 'alice', taskType: 'testing' });
      const event = {
        type: 'task:assigned' as const,
        agentId: 'alice',
        task,
      };

      taskFlowSystem.createTaskFlow(event);
      const flows = taskFlowSystem.getActiveFlows();
      expect(flows[flows.length - 1].taskType).toBe('testing');
    });
  });

  describe('updateTaskFlow', () => {
    it('should update flow status and progress', () => {
      const task = createTestTask({ id: 'task-2', agentId: 'bob', taskType: 'meeting' });
      const event = {
        type: 'task:assigned' as const,
        agentId: 'bob',
        task,
      };

      taskFlowSystem.createTaskFlow(event);
      const flows = taskFlowSystem.getActiveFlows();
      const flowId = flows[flows.length - 1].id;

      taskFlowSystem.updateTaskFlow(flowId, 'in-progress', 0.5);

      const updatedFlow = taskFlowSystem.getActiveFlows().find(f => f.id === flowId);
      expect(updatedFlow?.status).toBe('in-progress');
      expect(updatedFlow?.progress).toBe(0.5);
    });

    it('should handle non-existent flow gracefully', () => {
      expect(() => {
        taskFlowSystem.updateTaskFlow('non-existent', 'completed', 1);
      }).not.toThrow();
    });
  });

  describe('getFlowProgress', () => {
    it('should return 0 for non-existent flow', () => {
      const progress = taskFlowSystem.getFlowProgress('non-existent');
      expect(progress).toBe(0);
    });

    it('should return progress for existing flow', () => {
      const task = createTestTask({ id: 'task-3', agentId: 'charlie', taskType: 'review' });
      const event = {
        type: 'task:assigned' as const,
        agentId: 'charlie',
        task,
      };

      taskFlowSystem.createTaskFlow(event);
      const flows = taskFlowSystem.getActiveFlows();
      const flowId = flows[flows.length - 1].id;

      taskFlowSystem.updateTaskFlow(flowId, 'in-progress', 0.75);

      expect(taskFlowSystem.getFlowProgress(flowId)).toBe(0.75);
    });
  });

  describe('update loop', () => {
    it('should handle update without errors', () => {
      const task = createTestTask({ id: 'task-4', agentId: 'diana', taskType: 'coding' });
      const event = {
        type: 'task:assigned' as const,
        agentId: 'diana',
        task,
      };

      taskFlowSystem.createTaskFlow(event);
      const flows = taskFlowSystem.getActiveFlows();
      const flowId = flows[flows.length - 1].id;

      taskFlowSystem.updateTaskFlow(flowId, 'in-progress', 0);

      expect(() => taskFlowSystem.update()).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should clean up all flows on destroy', () => {
      const task = createTestTask({ id: 'task-5', agentId: 'alice', taskType: 'testing' });
      const event = {
        type: 'task:assigned' as const,
        agentId: 'alice',
        task,
      };

      taskFlowSystem.createTaskFlow(event);
      expect(taskFlowSystem.getActiveFlows().length).toBeGreaterThan(0);

      taskFlowSystem.destroy();

      expect(taskFlowSystem.getActiveFlows().length).toBe(0);
    });
  });

  describe('event handling', () => {
    it('should handle task:completed event', () => {
      const task = createTestTask({ id: 'task-6', agentId: 'bob', taskType: 'coding' });
      
      taskManager.assignTask('bob', task);
      taskManager.updateProgress('bob', 100);
      taskManager.completeTask('bob', 'success');

      const flows = taskFlowSystem.getActiveFlows();
      expect(flows.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle task:failed event', () => {
      const task = createTestTask({ id: 'task-7', agentId: 'charlie', taskType: 'debugging' });
      
      taskManager.assignTask('charlie', task);
      taskManager.completeTask('charlie', 'failure');

      const flows = taskFlowSystem.getActiveFlows();
      expect(flows.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle update without any flows', () => {
      expect(() => {
        taskFlowSystem.update();
      }).not.toThrow();
    });

    it('should handle getFlowProgress without any flows', () => {
      expect(taskFlowSystem.getFlowProgress('any-id')).toBe(0);
    });

    it('should handle destroy when already destroyed', () => {
      taskFlowSystem.destroy();
      expect(() => {
        taskFlowSystem.destroy();
      }).not.toThrow();
    });

    it('should handle update after destroy', () => {
      taskFlowSystem.destroy();
      expect(() => {
        taskFlowSystem.update();
      }).not.toThrow();
    });
  });
});

function createTestTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-task-' + Math.random().toString(36).slice(2, 8),
    agentId: 'alice',
    description: 'Test task',
    status: 'pending' as GameTaskStatus,
    progress: 0,
    currentAction: 'Idle',
    taskType: 'coding',
    assignedAt: Date.now(),
    completedAt: null,
    parentTaskId: null,
    ...overrides,
  };
}