import PerformanceMonitoringService from '@/services/PerformanceMonitoringService';

describe('PerformanceMonitoringService', () => {
  let performanceService: PerformanceMonitoringService;

  beforeEach(() => {
    performanceService = PerformanceMonitoringService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be a singleton', () => {
    const instance1 = PerformanceMonitoringService.getInstance();
    const instance2 = PerformanceMonitoringService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should initialize without errors', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Initialize twice to test singleton behavior
    performanceService.initialize();
    performanceService.initialize();
    
    // Should warn about already being initialized
    expect(consoleWarnSpy).toHaveBeenCalledWith('Performance monitoring already initialized');
    
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('should track API performance', () => {
    const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    
    performanceService.trackApiPerformance('test-api', 100, 200);
    
    expect(consoleDebugSpy).toHaveBeenCalledWith('API Performance: test-api', {
      duration: 100,
      statusCode: 200
    });
    
    consoleDebugSpy.mockRestore();
  });

  it('should track chunk load', () => {
    const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    
    performanceService.trackChunkLoad({
      chunkName: 'test-chunk',
      loadTime: 50,
      size: 1024
    });
    
    expect(consoleDebugSpy).toHaveBeenCalledWith('Bundle chunk loaded: test-chunk', {
      loadTime: 50,
      size: 1024
    });
    
    consoleDebugSpy.mockRestore();
  });

  it('should track resource load', () => {
    const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    
    performanceService.trackResourceLoad({
      name: 'test-resource',
      duration: 30,
      size: 512,
      startTime: 1000,
      transferSize: 600
    });
    
    expect(consoleDebugSpy).toHaveBeenCalledWith('Resource loaded: test-resource', {
      duration: 30,
      size: 512,
      startTime: 1000
    });
    
    consoleDebugSpy.mockRestore();
  });

  it('should track user interaction', () => {
    const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    
    performanceService.trackUserInteraction({
      interactionType: 'click',
      targetElement: 'BUTTON.test-button',
      duration: 10,
      timestamp: new Date().toISOString()
    });
    
    expect(consoleDebugSpy).toHaveBeenCalledWith('User interaction: click', {
      targetElement: 'BUTTON.test-button',
      duration: 10
    });
    
    consoleDebugSpy.mockRestore();
  });

  it('should check performance budgets', () => {
    const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    
    performanceService.checkPerformanceBudgets();
    
    // Should at least log that it's checking budgets
    expect(consoleDebugSpy).toHaveBeenCalled();
    
    consoleDebugSpy.mockRestore();
  });
});