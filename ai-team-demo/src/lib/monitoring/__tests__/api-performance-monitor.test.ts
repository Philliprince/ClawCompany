import { ApiPerformanceMonitor } from '../api-performance-monitor';

// Mock the PerformanceMonitor
jest.mock('../performance-monitor');
import { PerformanceMonitor } from '../performance-monitor';

describe('ApiPerformanceMonitor', () => {
  let performanceMonitor: jest.Mocked<PerformanceMonitor>;
  let apiMonitor: ApiPerformanceMonitor;

  beforeEach(() => {
    // 创建mock实例
    performanceMonitor = {
      recordApiCall: jest.fn(),
      getApiStats: jest.fn(),
      setSlowThreshold: jest.fn(),
      getMonitoredApis: jest.fn(),
      generatePerformanceReport: jest.fn(),
      cleanupOldData: jest.fn(),
      reset: jest.fn()
    } as jest.Mocked<PerformanceMonitor>;
    
    apiMonitor = new ApiPerformanceMonitor(performanceMonitor);
  });

  describe('API调用监控', () => {
    test('应该包装API调用并记录性能', async () => {
      const mockApiCall = jest.fn().mockResolvedValue({ success: true });
      const wrappedCall = apiMonitor.monitorApiCall('test-api', mockApiCall);
      
      await wrappedCall();
      
      expect(mockApiCall).toHaveBeenCalled();
      expect(performanceMonitor.recordApiCall).toHaveBeenCalledWith(
        'test-api',
        expect.any(Number),
        expect.any(Number),
        true
      );
    });

    test('应该正确处理API调用失败', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('API failed'));
      const wrappedCall = apiMonitor.monitorApiCall('test-api', mockApiCall);
      
      await expect(wrappedCall()).rejects.toThrow('API failed');
      
      expect(performanceMonitor.recordApiCall).toHaveBeenCalledWith(
        'test-api',
        expect.any(Number),
        expect.any(Number),
        false
      );
    });

    test('应该支持同步API调用', () => {
      const mockApiCall = jest.fn().mockReturnValue({ success: true });
      const wrappedCall = apiMonitor.monitorApiCallSync('sync-api', mockApiCall);
      
      wrappedCall();
      
      expect(mockApiCall).toHaveBeenCalled();
      expect(performanceMonitor.recordApiCall).toHaveBeenCalledWith(
        'sync-api',
        expect.any(Number),
        expect.any(Number),
        true
      );
    });
  });

  describe('LLM调用监控', () => {
    test('应该监控LLM调用', async () => {
      const mockLlmCall = jest.fn().mockResolvedValue('Response from LLM');
      const wrappedCall = apiMonitor.monitorLlmCall('glm-5', mockLlmCall);
      
      const result = await wrappedCall('Test prompt');
      
      expect(result).toBe('Response from LLM');
      expect(performanceMonitor.recordApiCall).toHaveBeenCalledWith(
        'llm-glm-5',
        expect.any(Number),
        expect.any(Number),
        true
      );
    });

    test('应该正确处理LLM调用失败', async () => {
      const mockLlmCall = jest.fn().mockRejectedValue(new Error('LLM unavailable'));
      const wrappedCall = apiMonitor.monitorLlmCall('glm-5', mockLlmCall);
      
      await expect(wrappedCall('Test prompt')).rejects.toThrow('LLM unavailable');
      
      expect(performanceMonitor.recordApiCall).toHaveBeenCalledWith(
        'llm-glm-5',
        expect.any(Number),
        expect.any(Number),
        false
      );
    });

    test('应该监控不同的LLM模型', async () => {
      const mockLlmCall = jest.fn().mockResolvedValue('Response');
      const wrappedCall = apiMonitor.monitorLlmCall('claude-3', mockLlmCall);
      
      await wrappedCall('Test prompt');
      
      expect(performanceMonitor.recordApiCall).toHaveBeenCalledWith(
        'llm-claude-3',
        expect.any(Number),
        expect.any(Number),
        true
      );
    });
  });

  describe('Agent调用监控', () => {
    test('应该监控agent调用', async () => {
      const mockAgentCall = jest.fn().mockResolvedValue({ result: 'Agent response' });
      const wrappedCall = apiMonitor.monitorAgentCall('dev-agent', mockAgentCall);
      
      const result = await wrappedCall('Test task');
      
      expect(result).toEqual({ result: 'Agent response' });
      expect(performanceMonitor.recordApiCall).toHaveBeenCalledWith(
        'agent-dev-agent',
        expect.any(Number),
        expect.any(Number),
        true
      );
    });

    test('应该监控不同类型的agent', async () => {
      const mockDevCall = jest.fn().mockResolvedValue({ result: 'Dev response' });
      const wrappedCall = apiMonitor.monitorDevAgent(mockDevCall);
      
      await wrappedCall('Test task');
      
      expect(performanceMonitor.recordApiCall).toHaveBeenCalledWith(
        'agent-dev',
        expect.any(Number),
        expect.any(Number),
        true
      );
    });

    test('应该监控reviewer agent调用', async () => {
      const mockReviewCall = jest.fn().mockResolvedValue({ review: 'Approved' });
      const wrappedCall = apiMonitor.monitorReviewerAgent(mockReviewCall);
      
      await wrappedCall('Code to review');
      
      expect(performanceMonitor.recordApiCall).toHaveBeenCalledWith(
        'agent-reviewer',
        expect.any(Number),
        expect.any(Number),
        true
      );
    });
  });

  describe('性能阈值配置', () => {
    test('应该允许配置LLM调用阈值', () => {
      apiMonitor.setLlmSlowThreshold(2000);
      
      expect(performanceMonitor.setSlowThreshold).toHaveBeenCalledWith(2000);
    });

    test('应该允许配置agent调用阈值', () => {
      apiMonitor.setAgentSlowThreshold(3000);
      
      expect(performanceMonitor.setSlowThreshold).toHaveBeenCalledWith(3000);
    });

    test('应该允许配置通用API阈值', () => {
      apiMonitor.setApiSlowThreshold(500);
      
      expect(performanceMonitor.setSlowThreshold).toHaveBeenCalledWith(500);
    });
  });

  describe('批量操作监控', () => {
    test('应该监控批量API调用', async () => {
      const mockCalls = [
        () => Promise.resolve('result1'),
        () => Promise.resolve('result2'),
        () => Promise.resolve('result3')
      ];
      
      const results = await apiMonitor.monitorBatchCalls('batch-api', mockCalls);
      
      expect(results).toEqual(['result1', 'result2', 'result3']);
      expect(performanceMonitor.recordApiCall).toHaveBeenCalledTimes(3);
    });

    test('应该正确处理批量调用中的失败', async () => {
      const mockCalls = [
        () => Promise.resolve('result1'),
        () => Promise.reject(new Error('Failed')),
        () => Promise.resolve('result3')
      ];
      
      const results = await apiMonitor.monitorBatchCalls('batch-api', mockCalls);
      
      expect(results).toEqual(['result1', undefined, 'result3']);
      expect(performanceMonitor.recordApiCall).toHaveBeenCalledTimes(3);
    });
  });

  describe('错误处理', () => {
    test('应该正确处理异步调用中的错误', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('Network error'));
      const wrappedCall = apiMonitor.monitorApiCall('error-api', mockApiCall);
      
      await expect(wrappedCall()).rejects.toThrow('Network error');
      
      expect(performanceMonitor.recordApiCall).toHaveBeenCalledWith(
        'error-api',
        expect.any(Number),
        expect.any(Number),
        false
      );
    });

    test('应该正确处理同步调用中的错误', () => {
      const mockApiCall = jest.fn(() => {
        throw new Error('Sync error');
      });
      const wrappedCall = apiMonitor.monitorApiCallSync('sync-error-api', mockApiCall);
      
      expect(() => wrappedCall()).toThrow('Sync error');
      
      expect(performanceMonitor.recordApiCall).toHaveBeenCalledWith(
        'sync-error-api',
        expect.any(Number),
        expect.any(Number),
        false
      );
    });
  });
});