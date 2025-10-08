import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Timeframe definitions
export type TimeframeType = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '7d' | '30d' | '90d' | '1y';

export interface TimeframeConfig {
  value: TimeframeType;
  label: string;
  minutes: number;
  maxDataPoints: number;
  aggregationLevel: 'raw' | 'minute' | 'hour' | 'day';
}

export const TIMEFRAMES: TimeframeConfig[] = [
  { value: '1m', label: '1 Minute', minutes: 1, maxDataPoints: 60, aggregationLevel: 'raw' },
  { value: '5m', label: '5 Minutes', minutes: 5, maxDataPoints: 288, aggregationLevel: 'raw' },
  { value: '15m', label: '15 Minutes', minutes: 15, maxDataPoints: 96, aggregationLevel: 'minute' },
  { value: '1h', label: '1 Hour', minutes: 60, maxDataPoints: 168, aggregationLevel: 'minute' },
  { value: '4h', label: '4 Hours', minutes: 240, maxDataPoints: 180, aggregationLevel: 'hour' },
  { value: '1d', label: '1 Day', minutes: 1440, maxDataPoints: 30, aggregationLevel: 'hour' },
  { value: '7d', label: '7 Days', minutes: 10080, maxDataPoints: 168, aggregationLevel: 'hour' },
  { value: '30d', label: '30 Days', minutes: 43200, maxDataPoints: 720, aggregationLevel: 'hour' },
  { value: '90d', label: '90 Days', minutes: 129600, maxDataPoints: 90, aggregationLevel: 'day' },
  { value: '1y', label: '1 Year', minutes: 525600, maxDataPoints: 365, aggregationLevel: 'day' }
];

export interface HistoricalDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export interface MetricTimeSeries {
  modelId: string;
  metric: string;
  timeframe: TimeframeType;
  data: HistoricalDataPoint[];
  aggregationLevel: string;
  lastUpdated: number;
}

export interface LiveDataUpdate {
  modelId: string;
  metrics: Record<string, number>;
  timestamp: number;
  predictions?: number;
  alerts?: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
}

export interface DashboardData {
  overview: {
    totalModels: number;
    activeModels: number;
    modelsNeedingRetraining: number;
    totalPredictions: number;
    avgAccuracy: number;
    lastUpdated: number;
  };
  models: Array<{
    id: string;
    version: string;
    status: string;
    accuracy: number;
    recentAccuracy: number;
    totalPredictions: number;
    drift: number;
    needsRetraining: boolean;
    lastUpdated: string;
    confidenceAvg: number;
    latency: number;
    memoryUsage: number;
    errorRate: number;
  }>;
  alerts: Array<{
    modelId: string;
    type: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>;
  abTests: Array<{
    id: string;
    modelA: { id: string; accuracy: number };
    modelB: { id: string; accuracy: number };
    status: string;
    startTime: number;
  }>;
  timeframe: string;
  timeSeries?: Record<string, MetricTimeSeries[]>;
}export interface ModelPerformanceReport {
  modelId: string;
  performance: {
    currentAccuracy: number;
    recentAccuracy: number;
    totalPredictions: number;
    accuratePredictions: number;
    confidenceAvg: number;
  };
  drift?: {
    overallDrift: number;
    accuracyDrift: number;
    confidenceDrift: number;
    featureDrift: { [key: string]: number };
    severity: string;
  };
  status: string;
  needsRetraining: boolean;
  lastUpdated: string;
}

export interface PredictionRecord {
  modelId: string;
  prediction: number;
  confidence: number;
  features?: { [key: string]: any };
  metadata?: { [key: string]: any };
  input?: any;
}

export interface ABTestConfig {
  modelA: string;
  modelB: string;
  config?: {
    trafficSplit?: number;
    duration?: number;
    minSampleSize?: number;
    significanceLevel?: number;
  };
}

export interface ABTestResult {
  id: string;
  modelA: {
    id: string;
    predictions: number;
    accuracy: number;
  };
  modelB: {
    id: string;
    predictions: number;
    accuracy: number;
  };
  status: string;
  startTime: number;
  endTime?: number;
  results?: {
    winner?: string;
    confidenceLevel: number;
    pValue: number;
    significanceTesting: any;
  };
  config: any;
}

export interface FeatureImportance {
  modelId: string;
  features: Array<{
    feature: string;
    importance: number;
    count: number;
  }>;
  totalFeatures: number;
  topFeatures: Array<{
    feature: string;
    importance: number;
  }>;
  lastUpdated: string;
}

export interface ModelComparison {
  models: Array<{
    id: string;
    accuracy: number;
    recentAccuracy: number;
    totalPredictions: number;
    drift: number;
    needsRetraining: boolean;
    status: string;
  }>;
  summary: {
    bestAccuracy: string | null;
    bestRecentAccuracy: string | null;
    leastDrift: string | null;
    mostPredictions: string | null;
  };
}

class MLPerformanceService {
  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getDashboard(params?: { timeframe?: string; metric?: string }): Promise<DashboardData> {
    try {
      const response = await axios.get(`${API_BASE_URL}/ml-performance/dashboard`, {
        headers: this.getAuthHeaders(),
        params
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  async getModelPerformance(modelId: string): Promise<ModelPerformanceReport> {
    try {
      const response = await axios.get(`${API_BASE_URL}/ml-performance/models/${modelId}`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error(`Failed to fetch performance for model ${modelId}:`, error);
      throw new Error(`Failed to fetch model performance`);
    }
  }

  async recordPrediction(prediction: PredictionRecord): Promise<string> {
    try {
      const response = await axios.post(`${API_BASE_URL}/ml-performance/predictions`, prediction, {
        headers: this.getAuthHeaders()
      });
      return response.data.data.predictionId;
    } catch (error) {
      console.error('Failed to record prediction:', error);
      throw new Error('Failed to record prediction');
    }
  }

  async updatePredictionOutcome(predictionId: string, outcome: number, metadata?: any): Promise<any> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/ml-performance/predictions/${predictionId}/outcome`,
        { outcome, metadata },
        { headers: this.getAuthHeaders() }
      );
      return response.data.data;
    } catch (error) {
      console.error('Failed to update prediction outcome:', error);
      throw new Error('Failed to update prediction outcome');
    }
  }

  async getModelDrift(modelId: string): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/ml-performance/models/${modelId}/drift`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error(`Failed to fetch drift analysis for model ${modelId}:`, error);
      throw new Error('Failed to fetch drift analysis');
    }
  }

  async getFeatureImportance(modelId: string): Promise<FeatureImportance> {
    try {
      const response = await axios.get(`${API_BASE_URL}/ml-performance/models/${modelId}/features`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error(`Failed to fetch feature importance for model ${modelId}:`, error);
      throw new Error('Failed to fetch feature importance');
    }
  }

  async triggerRetraining(modelId: string, reason?: string, metadata?: any): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/ml-performance/models/${modelId}/retrain`,
        { reason, metadata },
        { headers: this.getAuthHeaders() }
      );
      return response.data.data;
    } catch (error) {
      console.error(`Failed to trigger retraining for model ${modelId}:`, error);
      throw new Error('Failed to trigger retraining');
    }
  }

  async startABTest(config: ABTestConfig): Promise<string> {
    try {
      const response = await axios.post(`${API_BASE_URL}/ml-performance/ab-test`, config, {
        headers: this.getAuthHeaders()
      });
      return response.data.data.testId;
    } catch (error) {
      console.error('Failed to start A/B test:', error);
      throw new Error('Failed to start A/B test');
    }
  }

  async getABTestResults(testId: string): Promise<ABTestResult> {
    try {
      const response = await axios.get(`${API_BASE_URL}/ml-performance/ab-test/${testId}`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error(`Failed to fetch A/B test results for ${testId}:`, error);
      throw new Error('Failed to fetch A/B test results');
    }
  }

  async compareModels(modelIds: string[]): Promise<ModelComparison> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/ml-performance/compare`,
        { models: modelIds },
        { headers: this.getAuthHeaders() }
      );
      return response.data.data;
    } catch (error) {
      console.error('Failed to compare models:', error);
      throw new Error('Failed to compare models');
    }
  }

  async getSystemMetrics(): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/ml-performance/metrics`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
      throw new Error('Failed to fetch system metrics');
    }
  }

  async getHealthStatus(): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/ml-performance/health`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch health status:', error);
      throw new Error('Failed to fetch health status');
    }
  }

  async removeModelFromTracking(modelId: string): Promise<any> {
    try {
      const response = await axios.delete(`${API_BASE_URL}/ml-performance/models/${modelId}`, {
        headers: this.getAuthHeaders()
      });
      return response.data.data;
    } catch (error) {
      console.error(`Failed to remove model ${modelId} from tracking:`, error);
      throw new Error('Failed to remove model from tracking');
    }
  }

  // Real-time data helpers
  subscribeToModelUpdates(modelId: string, callback: (update: any) => void): () => void {
    // This would integrate with WebSocket implementation
    // For now, return a no-op unsubscribe function
    return () => {};
  }

  subscribeToSystemAlerts(callback: (alert: any) => void): () => void {
    // This would integrate with WebSocket implementation
    // For now, return a no-op unsubscribe function
    return () => {};
  }

  // Batch operations
  async batchRecordPredictions(predictions: PredictionRecord[]): Promise<string[]> {
    try {
      const predictionIds = await Promise.all(
        predictions.map(prediction => this.recordPrediction(prediction))
      );
      return predictionIds;
    } catch (error) {
      console.error('Failed to batch record predictions:', error);
      throw new Error('Failed to batch record predictions');
    }
  }

  async batchUpdateOutcomes(updates: Array<{ predictionId: string; outcome: number; metadata?: any }>): Promise<any[]> {
    try {
      const results = await Promise.all(
        updates.map(update => 
          this.updatePredictionOutcome(update.predictionId, update.outcome, update.metadata)
        )
      );
      return results;
    } catch (error) {
      console.error('Failed to batch update outcomes:', error);
      throw new Error('Failed to batch update outcomes');
    }
  }

  // Enhanced data fetching methods for live and historical data
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 30000; // 30 seconds
  private liveDataTimeout = 5000; // 5 seconds for live data

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private getTimeframeConfig(timeframe: TimeframeType): TimeframeConfig {
    return TIMEFRAMES.find(tf => tf.value === timeframe) || TIMEFRAMES[3]; // Default to 1h
  }

  private calculateTimeRange(timeframe: TimeframeType): { startTime: number; endTime: number } {
    const config = this.getTimeframeConfig(timeframe);
    const endTime = Date.now();
    const startTime = endTime - (config.minutes * 60 * 1000);
    return { startTime, endTime };
  }

  async getHistoricalData(
    modelId: string, 
    metric: string, 
    timeframe: TimeframeType,
    options?: {
      startTime?: number;
      endTime?: number;
      aggregation?: 'mean' | 'max' | 'min' | 'sum';
      fillGaps?: boolean;
    }
  ): Promise<MetricTimeSeries> {
    const cacheKey = `historical_${modelId}_${metric}_${timeframe}_${options?.startTime || 'auto'}`;
    const cached = this.getCachedData<MetricTimeSeries>(cacheKey);
    if (cached) return cached;

    try {
      const config = this.getTimeframeConfig(timeframe);
      const timeRange = options?.startTime && options?.endTime 
        ? { startTime: options.startTime, endTime: options.endTime }
        : this.calculateTimeRange(timeframe);

      const response = await axios.get(
        `${API_BASE_URL}/ml-performance/models/${modelId}/historical/${metric}`,
        {
          headers: this.getAuthHeaders(),
          params: {
            timeframe,
            startTime: timeRange.startTime,
            endTime: timeRange.endTime,
            aggregationLevel: config.aggregationLevel,
            maxDataPoints: config.maxDataPoints,
            aggregation: options?.aggregation || 'mean',
            fillGaps: options?.fillGaps || true
          }
        }
      );

      const result: MetricTimeSeries = {
        modelId,
        metric,
        timeframe,
        data: response.data.data || [],
        aggregationLevel: config.aggregationLevel,
        lastUpdated: Date.now()
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Failed to fetch historical data for ${modelId}:`, error);
      
      // Return mock data for development
      return this.generateMockHistoricalData(modelId, metric, timeframe);
    }
  }

  async getLiveData(modelIds: string[]): Promise<LiveDataUpdate[]> {
    const cacheKey = `live_${modelIds.join(',')}_${Math.floor(Date.now() / this.liveDataTimeout)}`;
    const cached = this.getCachedData<LiveDataUpdate[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${API_BASE_URL}/ml-performance/live`, {
        headers: this.getAuthHeaders(),
        params: {
          modelIds: modelIds.join(','),
          include: 'metrics,predictions,alerts'
        }
      });

      const result = response.data.data || [];
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to fetch live data:', error);
      
      // Return mock live data for development
      return this.generateMockLiveData(modelIds);
    }
  }

  async getMultiTimeframeData(
    modelId: string,
    metrics: string[],
    timeframes: TimeframeType[]
  ): Promise<Record<string, MetricTimeSeries[]>> {
    try {
      const promises = timeframes.flatMap(timeframe =>
        metrics.map(metric => 
          this.getHistoricalData(modelId, metric, timeframe)
        )
      );

      const results = await Promise.all(promises);
      
      const grouped: Record<string, MetricTimeSeries[]> = {};
      results.forEach(result => {
        if (!grouped[result.metric]) {
          grouped[result.metric] = [];
        }
        grouped[result.metric].push(result);
      });

      return grouped;
    } catch (error) {
      console.error('Failed to fetch multi-timeframe data:', error);
      throw new Error('Failed to fetch multi-timeframe data');
    }
  }

  async getAggregatedMetrics(
    modelIds: string[],
    metrics: string[],
    timeframe: TimeframeType,
    aggregationType: 'mean' | 'sum' | 'max' | 'min' = 'mean'
  ): Promise<Record<string, HistoricalDataPoint[]>> {
    try {
      const promises = modelIds.flatMap(modelId =>
        metrics.map(metric =>
          this.getHistoricalData(modelId, metric, timeframe, { aggregation: aggregationType })
        )
      );

      const results = await Promise.all(promises);
      
      // Aggregate data across models
      const aggregated: Record<string, HistoricalDataPoint[]> = {};
      
      metrics.forEach(metric => {
        const metricResults = results.filter(r => r.metric === metric);
        if (metricResults.length === 0) return;

        // Find common timestamps
        const allTimestamps = new Set<number>();
        metricResults.forEach(result => {
          result.data.forEach(point => allTimestamps.add(point.timestamp));
        });

        const sortedTimestamps = Array.from(allTimestamps).sort();
        
        aggregated[metric] = sortedTimestamps.map(timestamp => {
          const values = metricResults
            .map(result => result.data.find(point => point.timestamp === timestamp)?.value)
            .filter(value => value !== undefined) as number[];

          let aggregatedValue: number;
          switch (aggregationType) {
            case 'mean':
              aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
              break;
            case 'sum':
              aggregatedValue = values.reduce((sum, val) => sum + val, 0);
              break;
            case 'max':
              aggregatedValue = Math.max(...values);
              break;
            case 'min':
              aggregatedValue = Math.min(...values);
              break;
            default:
              aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
          }

          return {
            timestamp,
            value: aggregatedValue,
            metadata: {
              modelCount: values.length,
              aggregationType
            }
          };
        });
      });

      return aggregated;
    } catch (error) {
      console.error('Failed to fetch aggregated metrics:', error);
      throw new Error('Failed to fetch aggregated metrics');
    }
  }

  // Mock data generation for development
  private generateMockHistoricalData(
    modelId: string, 
    metric: string, 
    timeframe: TimeframeType
  ): MetricTimeSeries {
    const config = this.getTimeframeConfig(timeframe);
    const { startTime, endTime } = this.calculateTimeRange(timeframe);
    const interval = (endTime - startTime) / config.maxDataPoints;
    
    const baseValue = this.getBaseValueForMetric(metric);
    const data: HistoricalDataPoint[] = [];
    
    for (let i = 0; i < config.maxDataPoints; i++) {
      const timestamp = startTime + (i * interval);
      const variation = (Math.sin(i * 0.1) * 0.1) + (Math.random() * 0.05 - 0.025);
      const value = Math.max(0, Math.min(1, baseValue + variation));
      
      data.push({
        timestamp,
        value,
        metadata: {
          modelId,
          synthetic: true
        }
      });
    }

    return {
      modelId,
      metric,
      timeframe,
      data,
      aggregationLevel: config.aggregationLevel,
      lastUpdated: Date.now()
    };
  }

  private generateMockLiveData(modelIds: string[]): LiveDataUpdate[] {
    return modelIds.map(modelId => ({
      modelId,
      metrics: {
        accuracy: Math.random() * 0.2 + 0.8,
        precision: Math.random() * 0.15 + 0.82,
        recall: Math.random() * 0.15 + 0.8,
        f1Score: Math.random() * 0.1 + 0.85,
        drift: Math.random() * 0.3,
        latency: Math.random() * 50 + 20,
        errorRate: Math.random() * 0.05,
        confidence: Math.random() * 0.2 + 0.8
      },
      timestamp: Date.now(),
      predictions: Math.floor(Math.random() * 100),
      alerts: Math.random() > 0.8 ? [{
        type: 'drift_detected',
        severity: 'warning',
        message: 'Model drift detected in recent predictions'
      }] : undefined
    }));
  }

  private getBaseValueForMetric(metric: string): number {
    switch (metric) {
      case 'accuracy':
      case 'precision':
      case 'recall':
      case 'f1Score':
      case 'confidence':
        return 0.85;
      case 'drift':
        return 0.1;
      case 'errorRate':
        return 0.02;
      case 'latency':
        return 45;
      default:
        return 0.5;
    }
  }

  // Real-time data subscription management
  private subscriptions = new Map<string, () => void>();

  subscribeToLiveUpdates(
    modelIds: string[],
    callback: (updates: LiveDataUpdate[]) => void,
    interval: number = 5000
  ): string {
    const subscriptionId = `live_${Date.now()}_${Math.random()}`;
    
    const fetchAndNotify = async () => {
      try {
        const updates = await this.getLiveData(modelIds);
        callback(updates);
      } catch (error) {
        console.error('Failed to fetch live updates:', error);
      }
    };

    // Initial fetch
    fetchAndNotify();
    
    // Set up interval
    const intervalId = setInterval(fetchAndNotify, interval);
    
    this.subscriptions.set(subscriptionId, () => {
      clearInterval(intervalId);
    });

    return subscriptionId;
  }

  unsubscribeFromLiveUpdates(subscriptionId: string): void {
    const cleanup = this.subscriptions.get(subscriptionId);
    if (cleanup) {
      cleanup();
      this.subscriptions.delete(subscriptionId);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Utility methods
  formatAccuracy(accuracy: number): string {
    return `${(accuracy * 100).toFixed(1)}%`;
  }

  formatDrift(drift: number): string {
    return `${(drift * 100).toFixed(2)}%`;
  }

  getDriftSeverity(drift: number): 'low' | 'medium' | 'high' | 'critical' {
    if (drift < 0.05) return 'low';
    if (drift < 0.1) return 'medium';
    if (drift < 0.15) return 'high';
    return 'critical';
  }

  getAccuracyRating(accuracy: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (accuracy >= 0.9) return 'excellent';
    if (accuracy >= 0.8) return 'good';
    if (accuracy >= 0.7) return 'fair';
    return 'poor';
  }

  // Export/Import functionality
  async exportModelPerformanceData(modelIds: string[], format: 'csv' | 'json' = 'json'): Promise<Blob> {
    try {
      const data = await Promise.all(
        modelIds.map(id => this.getModelPerformance(id))
      );
      
      if (format === 'csv') {
        const csv = this.convertToCSV(data);
        return new Blob([csv], { type: 'text/csv' });
      } else {
        return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      }
    } catch (error) {
      console.error('Failed to export performance data:', error);
      throw new Error('Failed to export performance data');
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => Object.values(item).join(','));
    
    return [headers, ...rows].join('\n');
  }
}

// Create and export singleton instance
export const mlPerformanceService = new MLPerformanceService();
export default mlPerformanceService;
