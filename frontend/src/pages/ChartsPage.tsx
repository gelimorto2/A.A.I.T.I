import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Toolbar, FormControl, Select, MenuItem, CircularProgress } from '@mui/material';
import axios from 'axios';

interface Candle { time: number; open:number; high:number; low:number; close:number; }

const timeframes = [
  { label:'1m', value:'1m' },
  { label:'5m', value:'5m' },
  { label:'15m', value:'15m' },
  { label:'1h', value:'1h' },
  { label:'4h', value:'4h' },
  { label:'1d', value:'1d' }
];

const ChartsPage: React.FC = () => {
  const [tf, setTf] = useState('1h');
  const [symbol, setSymbol] = useState('bitcoin');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // backend endpoint to create: /api/market/history?symbol=&tf=
      const res = await axios.get(`/api/market/history?symbol=${symbol}&tf=${tf}`);
      setCandles(res.data.candles || []);
    } catch(e){
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ loadData(); // eslint-disable-next-line
  }, [tf, symbol]);

  return (
    <Box>
      <Toolbar disableGutters sx={{ mb:2, gap:2, flexWrap:'wrap' }}>
        <Typography variant="h4" sx={{ fontWeight:'bold' }}>Market Charts</Typography>
        <Box sx={{ flexGrow:1 }} />
        <FormControl size="small">
          <Select value={symbol} onChange={e=>setSymbol(e.target.value)}>
            <MenuItem value="bitcoin">BTC</MenuItem>
            <MenuItem value="ethereum">ETH</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <Select value={tf} onChange={e=>setTf(e.target.value)}>
            {timeframes.map(t=> <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Toolbar>
      <Paper sx={{ p:2, height:'70vh', position:'relative' }}>
        {loading && <CircularProgress size={48} sx={{ position:'absolute', top:'50%', left:'50%', mt:'-24px', ml:'-24px' }} />}
        {/* Simple placeholder line/candle rendering (can be replaced with a library) */}
        <Box component="pre" sx={{ fontSize:10, overflow:'auto', height:'100%', m:0 }}>
          {candles.slice(-200).map(c=> `${new Date(c.time).toISOString()} O:${c.open} H:${c.high} L:${c.low} C:${c.close}`).join('\n')||'No data'}
        </Box>
      </Paper>
    </Box>
  );
};

export default ChartsPage;
