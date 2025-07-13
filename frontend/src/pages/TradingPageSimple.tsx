import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Refresh,
  Add,
} from '@mui/icons-material';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  isMock?: boolean;
}

const TradingPageSimple: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const popularSymbols = useMemo(() => ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META'], []);

  const fetchMarketData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/trading/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ symbols: popularSymbols })
      });
      
      if (response.ok) {
        const data = await response.json();
        const quotes = data.quotes
          .filter((q: any) => q.success)
          .map((q: any) => q.data);
        setMarketData(quotes);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  }, [popularSymbols]);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 10000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  return (
    <Box>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          fontWeight: 'bold', 
          color: 'primary.main',
          fontFamily: 'monospace',
        }}
      >
        LIVE TRADING
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Card sx={{ bgcolor: 'background.paper', border: '1px solid #333', mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              Market Overview
            </Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchMarketData}
                sx={{ mr: 1 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                disabled
              >
                Execute Trade
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper} sx={{ bgcolor: 'background.default' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Symbol</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Price</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Change</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Change %</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold' }}>Volume</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {marketData.map((stock) => (
                  <TableRow key={stock.symbol}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography fontWeight="bold">{stock.symbol}</Typography>
                        {stock.isMock && (
                          <Chip 
                            label="DEMO" 
                            size="small" 
                            color="warning" 
                            sx={{ ml: 1, fontSize: '0.6rem' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="bold">
                        ${stock.price.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {stock.change >= 0 ? (
                          <TrendingUp sx={{ color: '#00ff88', mr: 0.5 }} />
                        ) : (
                          <TrendingDown sx={{ color: '#ff3366', mr: 0.5 }} />
                        )}
                        <Typography 
                          color={stock.change >= 0 ? '#00ff88' : '#ff3366'}
                          fontWeight="bold"
                        >
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        color={stock.change >= 0 ? '#00ff88' : '#ff3366'}
                        fontWeight="bold"
                      >
                        {stock.change >= 0 ? '+' : ''}{stock.changePercent}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {stock.volume.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {marketData.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                Loading market data...
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Alert severity="info">
        Trading functionality is connected to real market data. The application uses encrypted credentials and supports paper trading, shadow mode, and live trading modes through the bot management system.
      </Alert>
    </Box>
  );
};

export default TradingPageSimple;