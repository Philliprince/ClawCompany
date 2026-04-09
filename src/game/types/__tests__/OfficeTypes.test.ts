import {
  RoomName,
  Workstation,
  Platform,
  TilemapData,
  ActiveTask,
  TaskType,
} from '../OfficeTypes';

describe('OfficeTypes', () => {
  describe('RoomName', () => {
    it('should have all expected room names', () => {
      const rooms: RoomName[] = ['pm-office', 'dev-studio', 'test-lab', 'review-center'];
      
      rooms.forEach(room => {
        expect(room).toBeDefined();
      });
    });

    it('should match expected room name values', () => {
      expect('pm-office').toBe('pm-office');
      expect('dev-studio').toBe('dev-studio');
      expect('test-lab').toBe('test-lab');
      expect('review-center').toBe('review-center');
    });
  });

  describe('TaskType', () => {
    it('should have valid task types', () => {
      const validTypes: TaskType[] = ['coding', 'testing', 'review', 'meeting'];
      
      validTypes.forEach(type => {
        expect(type).toBeDefined();
      });
    });
  });

  describe('Workstation', () => {
    it('should create valid workstation', () => {
      const workstation: Workstation = {
        id: 'ws-1',
        x: 100,
        y: 200,
        label: 'PM Desk',
        status: 'idle',
        taskType: 'meeting',
      };

      expect(workstation.id).toBe('ws-1');
      expect(workstation.x).toBe(100);
      expect(workstation.y).toBe(200);
      expect(workstation.label).toBe('PM Desk');
      expect(workstation.status).toBe('idle');
      expect(workstation.taskType).toBe('meeting');
    });

    it('should allow busy status', () => {
      const busyWorkstation: Workstation = {
        id: 'ws-2',
        x: 300,
        y: 400,
        label: 'Dev Station',
        status: 'busy',
        taskType: 'coding',
      };

      expect(busyWorkstation.status).toBe('busy');
    });

    it('should support all task types', () => {
      const taskTypes: TaskType[] = ['coding', 'testing', 'review', 'meeting'];
      
      taskTypes.forEach(taskType => {
        const workstation: Workstation = {
          id: 'ws-test',
          x: 0,
          y: 0,
          label: 'Test',
          status: 'idle',
          taskType,
        };

        expect(workstation.taskType).toBe(taskType);
      });
    });
  });

  describe('Platform', () => {
    it('should create valid platform', () => {
      const platform: Platform = {
        x: 50,
        y: 100,
        width: 200,
        height: 20,
        type: 'floor',
      };

      expect(platform.x).toBe(50);
      expect(platform.y).toBe(100);
      expect(platform.width).toBe(200);
      expect(platform.height).toBe(20);
      expect(platform.type).toBe('floor');
    });

    it('should support different platform types', () => {
      const platformTypes = ['wall', 'floor', 'desk', 'chair', 'platform'];
      
      platformTypes.forEach(type => {
        const platform: Platform = {
          x: 0,
          y: 0,
          width: 32,
          height: 32,
          type,
        };

        expect(platform.type).toBe(type);
      });
    });
  });

  describe('TilemapData', () => {
    it('should create valid tilemap data', () => {
      const tilemap: TilemapData = {
        width: 20,
        height: 15,
        tileSize: 32,
        workstations: [],
        platforms: [],
      };

      expect(tilemap.width).toBe(20);
      expect(tilemap.height).toBe(15);
      expect(tilemap.tileSize).toBe(32);
      expect(tilemap.workstations).toEqual([]);
      expect(tilemap.platforms).toEqual([]);
    });

    it('should include workstations in tilemap', () => {
      const workstations: Workstation[] = [
        { id: 'ws-1', x: 100, y: 200, label: 'Desk 1', status: 'idle', taskType: 'coding' },
        { id: 'ws-2', x: 300, y: 400, label: 'Desk 2', status: 'busy', taskType: 'testing' },
      ];

      const tilemap: TilemapData = {
        width: 20,
        height: 15,
        tileSize: 32,
        workstations,
        platforms: [],
      };

      expect(tilemap.workstations).toHaveLength(2);
      expect(tilemap.workstations[0].id).toBe('ws-1');
      expect(tilemap.workstations[1].status).toBe('busy');
    });

    it('should include platforms in tilemap', () => {
      const platforms: Platform[] = [
        { x: 0, y: 0, width: 20, height: 1, type: 'wall' },
        { x: 0, y: 14, width: 20, height: 1, type: 'floor' },
      ];

      const tilemap: TilemapData = {
        width: 20,
        height: 15,
        tileSize: 32,
        workstations: [],
        platforms,
      };

      expect(tilemap.platforms).toHaveLength(2);
      expect(tilemap.platforms[0].type).toBe('wall');
      expect(tilemap.platforms[1].type).toBe('floor');
    });
  });

  describe('ActiveTask', () => {
    it('should create valid active task', () => {
      const activeTask: ActiveTask = {
        agentId: 'agent-1',
        targetX: 150,
        targetY: 250,
        returning: false,
      };

      expect(activeTask.agentId).toBe('agent-1');
      expect(activeTask.targetX).toBe(150);
      expect(activeTask.targetY).toBe(250);
      expect(activeTask.returning).toBe(false);
    });

    it('should support returning state', () => {
      const returningTask: ActiveTask = {
        agentId: 'agent-2',
        targetX: 100,
        targetY: 100,
        returning: true,
      };

      expect(returningTask.returning).toBe(true);
    });

    it('should allow multiple active tasks for different agents', () => {
      const activeTasks: ActiveTask[] = [
        { agentId: 'alice', targetX: 100, targetY: 100, returning: false },
        { agentId: 'bob', targetX: 200, targetY: 200, returning: false },
        { agentId: 'charlie', targetX: 300, targetY: 150, returning: true },
      ];

      expect(activeTasks).toHaveLength(3);
      
      const agentIds = activeTasks.map(t => t.agentId);
      expect(agentIds).toContain('alice');
      expect(agentIds).toContain('bob');
      expect(agentIds).toContain('charlie');
    });
  });

  describe('edge cases', () => {
    it('should handle zero coordinates', () => {
      const platform: Platform = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        type: 'test',
      };

      expect(platform.x).toBe(0);
      expect(platform.y).toBe(0);
    });

    it('should handle large coordinates', () => {
      const workstation: Workstation = {
        id: 'ws-large',
        x: 10000,
        y: 10000,
        label: 'Large coordinates',
        status: 'idle',
        taskType: 'coding',
      };

      expect(workstation.x).toBe(10000);
      expect(workstation.y).toBe(10000);
    });

    it('should handle empty tilemap', () => {
      const emptyTilemap: TilemapData = {
        width: 0,
        height: 0,
        tileSize: 0,
        workstations: [],
        platforms: [],
      };

      expect(emptyTilemap.width).toBe(0);
      expect(emptyTilemap.workstations).toHaveLength(0);
      expect(emptyTilemap.platforms).toHaveLength(0);
    });

    it('should handle special characters in labels', () => {
      const workstation: Workstation = {
        id: 'ws-special',
        x: 50,
        y: 50,
        label: 'Desk #1 (PM)',
        status: 'idle',
        taskType: 'meeting',
      };

      expect(workstation.label).toBe('Desk #1 (PM)');
    });
  });
});