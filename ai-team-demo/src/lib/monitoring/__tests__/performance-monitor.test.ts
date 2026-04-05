import { PerformanceMonitor } from '../performance-monitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe('基本功能测试', () => {
    test('应该能够记录API调用时间', () => {
      const startTime = Date.now();
      const result = monitor.recordApiCall('test-api', startTime, Date.now());
      
      expect(result).toMatchObject({
        api: 'test-api',
        duration: expect.any(Number),
        timestamp: expect.any(Number),
        success: true
      });
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('应该能够记录失败的API调用', () => {
      const startTime = Date.now();
      const result = monitor.recordApiCall('test-api', startTime, Date.now(), false);
      
      expect(result.success).toBe(false);
    });

    test('应该计算平均响应时间', () => {
      monitor.recordApiCall('api1', 0, 100);
      monitor.recordApiCall('api1', 0, 200);
      monitor.recordApiCall('api1', 0, 300);
      
      const stats = monitor.getApiStats('api1');
      expect(stats.averageResponseTime).toBe(200);
      expect(stats.totalCalls).toBe(3);
    });

    test('应该处理不存在的API统计', () => {
      const stats = monitor.getApiStats('non-existent');
      expect(stats.totalCalls).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('性能阈值测试', () => {
    test('应该识别慢速调用', () => {
      monitor.setSlowThreshold(500); // 500ms
      monitor.recordApiCall('api', 0, 1000); // 慢调用
      monitor.recordApiCall('api', 0, 200);  // 快调用
      
      const stats = monitor.getApiStats('api');
      expect(stats.slowCallCount).toBe(1);
      expect(stats.fastCallCount).toBe(1);
    });

    test('应该设置性能阈值', () => {
      monitor.setSlowThreshold(500); // 500ms
      monitor.recordApiCall('api', 0, 1000); // 慢调用
      monitor.recordApiCall('api', 0, 200);  // 快调用
      
      const stats = monitor.getApiStats('api');
      expect(stats.slowCallCount).toBe(1);
      expect(stats.fastCallCount).toBe(1);
    });
  });

  describe('内存使用监控', () => {
    test('应该记录内存使用情况', () => {
      const memoryUsage = {
        used: 100,
        total: 1000,
        percentage: 10
      };
      
      monitor.recordMemoryUsage(memoryUsage);
      
      const stats = monitor.getMemoryStats();
      expect(stats.currentUsage).toBe(memoryUsage.used);
      expect(stats.averageUsage).toBe(memoryUsage.used);
    });

    test('应该计算平均内存使用', () => {
      monitor.recordMemoryUsage({ used: 100, total: 1000, percentage: 10 });
      monitor.recordMemoryUsage({ used: 200, total: 1000, percentage: 20 });
      
      const stats = monitor.getMemoryStats();
      expect(stats.averageUsage).toBe(150);
    });
  });

  describe('数据清理测试', () => {
    test('应该能够清理旧的记录', () => {
      const oldTime = Date.now() - 86400000; // 1天前
      const currentTime = Date.now();
      
      monitor.recordApiCall('old-api', oldTime, oldTime + 100);
      monitor.recordApiCall('new-api', currentTime, currentTime + 100);
      
      // 使用较短的时间范围进行测试
      monitor.cleanupOldData(1000); // 保留1秒内的数据
      
      expect(monitor.getApiStats('old-api').totalCalls).toBe(0);
      expect(monitor.getApiStats('new-api').totalCalls).toBe(1);
    });

    test('清理后应该保留新记录', () => {
      const recentTime = Date.now();
      const oldTime = Date.now() - 2000; // 2秒前
      
      monitor.recordApiCall('recent-api', recentTime, recentTime + 100);
      monitor.recordApiCall('old-api', oldTime, oldTime + 100);
      
      monitor.cleanupOldData(1000); // 保留1秒内的数据
      
      expect(monitor.getApiStats('recent-api').totalCalls).toBe(1);
      expect(monitor.getApiStats('old-api').totalCalls).toBe(0);
    });
  });

  describe('性能报告测试', () => {
    test('应该生成性能报告', () => {
      monitor.recordApiCall('api1', 0, 100);
      monitor.recordApiCall('api1', 0, 200);
      monitor.recordApiCall('api2', 0, 50);
      
      const report = monitor.generatePerformanceReport();
      
      expect(report).toMatchObject({
        totalApiCalls: 3,
        averageResponseTime: expect.any(Number),
        memoryStats: expect.any(Object),
        apiPerformance: expect.any(Object)
      });
    });

    test('报告应该包含时间范围信息', () => {
      const startTime = Date.now();
      monitor.recordApiCall('test-api', startTime, startTime + 100);
      
      const report = monitor.generatePerformanceReport();
      expect(report.timeRange).toMatchObject({
        start: expect.any(Number),
        end: expect.any(Number),
        duration: expect.any(Number)
      });
    });

    test('报告应该正确计算统计数据', () => {
      monitor.recordApiCall('api1', 0, 100, true);
      monitor.recordApiCall('api1', 0, 200, true);
      monitor.recordApiCall('api1', 0, 300, false);
      
      const report = monitor.generatePerformanceReport();
      
      expect(report.totalApiCalls).toBe(3);
      expect(report.successRate).toBeCloseTo(0.67, 2); // 2/3 成功率
      expect(report.averageResponseTime).toBe(200); // (100+200+300)/3
    });
  });

  describe('边界情况测试', () => {
    test('应该处理空记录的情况', () => {
      const stats = monitor.getApiStats('non-existent-api');
      expect(stats.totalCalls).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
    });

    test('应该正确计算单个API的统计', () => {
      monitor.recordApiCall('single-api', 0, 150, true);
      
      const stats = monitor.getApiStats('single-api');
      expect(stats.totalCalls).toBe(1);
      expect(stats.successfulCalls).toBe(1);
      expect(stats.failedCalls).toBe(0);
      expect(stats.averageResponseTime).toBe(150);
      expect(stats.minResponseTime).toBe(150);
      expect(stats.maxResponseTime).toBe(150);
      expect(stats.successRate).toBe(1);
    });

    test('应该处理内存记录为空的情况', () => {
      const stats = monitor.getMemoryStats();
      expect(stats.currentUsage).toBe(0);
      expect(stats.averageUsage).toBe(0);
      expect(stats.peakUsage).toBe(0);
      expect(stats.currentPercentage).toBe(0);
      expect(stats.averagePercentage).toBe(0);
    });
  });

  describe('重置功能测试', () => {
    test('应该重置所有数据', () => {
      monitor.recordApiCall('test-api', 0, 100);
      monitor.recordMemoryUsage({ used: 100, total: 1000, percentage: 10 });
      
      monitor.reset();
      
      expect(monitor.getApiStats('test-api').totalCalls).toBe(0);
      expect(monitor.getMemoryStats().currentUsage).toBe(0);
      expect(monitor.getMonitoredApis()).toHaveLength(0);
    });
  });
});