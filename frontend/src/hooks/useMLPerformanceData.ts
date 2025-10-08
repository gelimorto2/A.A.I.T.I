import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { 
  mlPerformanceService, 
  TimeframeType, 
  MetricTimeSeries, 
  LiveDataUpdate,
  DashboardData 
} from '../services/mlPerformanceService';

interface UseMLPerformanceDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableWebSocket?: boolean;
  timeframe?: TimeframeType;
  modelIds?: string[];
  metrics?: string[];
}

interface MLPerformanceDataState {
  dashboard: DashboardData | null;
  historicalData: Record<string, MetricTimeSeries[]>;
  liveData: LiveDataUpdate[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

export const useMLPerformanceData = (options: UseMLPerformanceDataOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    enableWebSocket = true,
    timeframe = '1h',
    modelIds = [],
    metrics = ['accuracy', 'drift', 'latency', 'errorRate']
  } = options;

  const [state, setState] = useState<MLPerformanceDataState>({
    dashboard: null,
    historicalData: {},
    liveData: [],
    loading: true,
    error: null,
    lastUpdated: null
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const liveDataSubscriptionRef = useRef<string>();

  // WebSocket connection for real-time updates
  const { 
    isConnected, 
    data: wsData, 
    subscribeToModelUpdates,
    subscribeToTimeframeData 
  } = useWebSocket('/ml-performance', {
    reconnect: true,
    autoConnect: enableWebSocket
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<MLPerformanceDataState>) => {
    setState(prev => ({ ...prev, ...updates, lastUpdated: Date.now() }));
  }, []);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        updateState({ loading: true, error: null });
      }

      const dashboard = await mlPerformanceService.getDashboard({
        timeframe,
        metric: 'accuracy'
      });

      updateState({ dashboard, loading: false });
      return dashboard;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
      updateState({ error: errorMessage, loading: false });
      console.error('Dashboard fetch error:', error);
      throw error;
    }
  }, [timeframe, updateState]);

  // Fetch historical data for multiple models and metrics
  const fetchHistoricalData = useCallback(async (
    targetModelIds?: string[],
    targetMetrics?: string[],
    targetTimeframe?: TimeframeType
  ) => {
    const modelsToFetch = targetModelIds || modelIds;
    const metricsToFetch = targetMetrics || metrics;
    const timeframeToUse = targetTimeframe || timeframe;

    if (modelsToFetch.length === 0) return;

    try {
      const promises = modelsToFetch.flatMap(modelId =>
        metricsToFetch.map(metric =>
          mlPerformanceService.getHistoricalData(modelId, metric, timeframeToUse)
        )
      );

      const results = await Promise.all(promises);
      
      // Group by metric
      const grouped: Record<string, MetricTimeSeries[]> = {};
      results.forEach(result => {
        if (!grouped[result.metric]) {
          grouped[result.metric] = [];
        }
        grouped[result.metric].push(result);
      });

      updateState({ 
        historicalData: { ...state.historicalData, ...grouped }
      });

      return grouped;
    } catch (error) {
      console.error('Historical data fetch error:', error);
      throw error;
    }
  }, [modelIds, metrics, timeframe, state.historicalData, updateState]);

  // Fetch live data
  const fetchLiveData = useCallback(async (targetModelIds?: string[]) => {
    const modelsToFetch = targetModelIds || modelIds;
    
    if (modelsToFetch.length === 0) return;

    try {
      const liveData = await mlPerformanceService.getLiveData(modelsToFetch);
      updateState({ liveData });
      return liveData;
    } catch (error) {
      console.error('Live data fetch error:', error);
      throw error;
    }
  }, [modelIds, updateState]);

  // Comprehensive data refresh
  const refreshAllData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        updateState({ loading: true, error: null });
      }

      const [dashboard, historicalData, liveData] = await Promise.allSettled([
        fetchDashboard(false),
        fetchHistoricalData(),
        fetchLiveData()
      ]);

      // Handle any errors
      const errors = [dashboard, historicalData, liveData]
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason.message);

      if (errors.length > 0) {
        updateState({ 
          error: `Some data failed to load: ${errors.join(', ')}`,
          loading: false 
        });
      } else {
        updateState({ loading: false, error: null });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      updateState({ error: errorMessage, loading: false });
    }
  }, [fetchDashboard, fetchHistoricalData, fetchLiveData, updateState]);

  // Get data for specific timeframes
  const getTimeframeData = useCallback(async (
    newTimeframe: TimeframeType,
    targetModelIds?: string[]
  ) => {
    const modelsToFetch = targetModelIds || modelIds;
    
    if (modelsToFetch.length === 0) return {};

    try {
      updateState({ loading: true });
      
      const results = await Promise.all([
        mlPerformanceService.getDashboard({ timeframe: newTimeframe }),
        fetchHistoricalData(modelsToFetch, metrics, newTimeframe)
      ]);

      const [dashboard, historicalData] = results;
      
      updateState({ 
        dashboard,
        historicalData: { ...state.historicalData, ...historicalData },
        loading: false 
      });

      return { dashboard, historicalData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch timeframe data';
      updateState({ error: errorMessage, loading: false });
      throw error;
    }
  }, [modelIds, metrics, state.historicalData, updateState, fetchHistoricalData]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!enableWebSocket || !isConnected) return;

    // Subscribe to model updates
    if (modelIds.length > 0) {
      const unsubscribe = subscribeToModelUpdates(modelIds, (update) => {
        console.log('Received model update:', update);
        
        // Update live data
        setState(prev => {
          const existingIndex = prev.liveData.findIndex(data => data.modelId === update.modelId);
          const updatedLiveData = [...prev.liveData];
          
          if (existingIndex >= 0) {
            updatedLiveData[existingIndex] = { ...updatedLiveData[existingIndex], ...update };
          } else {
            updatedLiveData.push(update);
          }

          return {
            ...prev,
            liveData: updatedLiveData,
            lastUpdated: Date.now()
          };
        });
      });

      return unsubscribe;
    }
  }, [enableWebSocket, isConnected, modelIds, subscribeToModelUpdates]);

  // Subscribe to timeframe-specific data
  useEffect(() => {
    if (!enableWebSocket || !isConnected) return;

    const unsubscribe = subscribeToTimeframeData(timeframe, (data) => {
      console.log('Received timeframe data:', data);
      
      // Update historical data with new points
      if (data.type === 'historical-update' && data.series) {
        setState(prev => ({
          ...prev,
          historicalData: {
            ...prev.historicalData,
            [data.series.metric]: prev.historicalData[data.series.metric]?.map(series =>
              series.modelId === data.series.modelId && series.timeframe === data.series.timeframe
                ? { ...series, data: [...series.data, ...data.series.newPoints] }
                : series
            ) || [data.series]
          },
          lastUpdated: Date.now()
        }));
      }
    });

    return unsubscribe;
  }, [enableWebSocket, isConnected, timeframe, subscribeToTimeframeData]);

  // Handle general WebSocket data
  useEffect(() => {
    if (!wsData) return;

    switch (wsData.type) {
      case 'ml-performance-update':
        // Refresh specific model data
        if (wsData.data.modelId && modelIds.includes(wsData.data.modelId)) {
          fetchLiveData([wsData.data.modelId]);
        }
        break;
        
      case 'model-alert':
        // Add alert to dashboard
        setState(prev => ({
          ...prev,
          dashboard: prev.dashboard ? {
            ...prev.dashboard,
            alerts: [wsData.data, ...prev.dashboard.alerts.slice(0, 9)]
          } : prev.dashboard,
          lastUpdated: Date.now()
        }));
        break;
        
      case 'drift-detected':
        // Update model drift status
        setState(prev => ({
          ...prev,
          dashboard: prev.dashboard ? {
            ...prev.dashboard,
            models: prev.dashboard.models.map(model =>
              model.id === wsData.data.modelId
                ? { ...model, drift: wsData.data.driftScore, needsRetraining: wsData.data.needsRetraining }
                : model
            )
          } : prev.dashboard,
          lastUpdated: Date.now()
        }));
        break;
        
      default:
        console.log('Unhandled WebSocket data type:', wsData.type);
    }
  }, [wsData, modelIds, fetchLiveData]);

  // Auto-refresh mechanism
  useEffect(() => {
    if (!autoRefresh) return;

    const startAutoRefresh = () => {
      refreshIntervalRef.current = setInterval(() => {
        if (!enableWebSocket || !isConnected) {
          // Only refresh via polling if WebSocket is not available
          fetchLiveData();
        }
      }, refreshInterval);
    };

    // Initial load
    refreshAllData(true);
    
    // Start auto-refresh
    startAutoRefresh();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, enableWebSocket, isConnected, refreshAllData, fetchLiveData]);

  // Live data subscription for polling fallback
  useEffect(() => {
    if (enableWebSocket && isConnected) return; // Skip polling if WebSocket is available

    if (modelIds.length > 0) {
      const subscriptionId = mlPerformanceService.subscribeToLiveUpdates(
        modelIds,
        (updates) => {
          updateState({ liveData: updates });
        },
        Math.min(refreshInterval, 10000) // Max 10 seconds for polling
      );

      liveDataSubscriptionRef.current = subscriptionId;

      return () => {
        if (liveDataSubscriptionRef.current) {
          mlPerformanceService.unsubscribeFromLiveUpdates(liveDataSubscriptionRef.current);
        }
      };
    }
  }, [enableWebSocket, isConnected, modelIds, refreshInterval, updateState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (liveDataSubscriptionRef.current) {
        mlPerformanceService.unsubscribeFromLiveUpdates(liveDataSubscriptionRef.current);
      }
    };
  }, []);

  return {
    // Data
    ...state,
    isConnected: enableWebSocket ? isConnected : true,
    
    // Actions
    refreshData: refreshAllData,
    fetchDashboard,
    fetchHistoricalData,
    fetchLiveData,
    getTimeframeData,
    
    // Utilities
    clearCache: mlPerformanceService.clearCache,
    
    // WebSocket info
    webSocketEnabled: enableWebSocket,
    webSocketConnected: isConnected
  };
};

export default useMLPerformanceData;