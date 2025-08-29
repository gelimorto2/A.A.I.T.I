import React from 'react';
import { Card, CardHeader, CardContent, Typography, Grid } from '@mui/material';

interface ClockWidgetProps { id: string; onRemove?: (id:string)=>void; }

const timezones = [
  { label: 'UTC', zone: 'UTC' },
  { label: 'New York', zone: 'America/New_York' },
  { label: 'London', zone: 'Europe/London' },
  { label: 'Tokyo', zone: 'Asia/Tokyo' }
];

const ClockWidget: React.FC<ClockWidgetProps> = () => {
  const [now, setNow] = React.useState<Date>(new Date());
  React.useEffect(()=>{ const t = setInterval(()=> setNow(new Date()), 1000); return ()=> clearInterval(t); },[]);
  return (
    <Card sx={{ height: '100%', display:'flex', flexDirection:'column' }}>
      <CardHeader title="World Clocks" sx={{ pb:0 }} />
      <CardContent sx={{ flexGrow:1 }}>
        <Grid container spacing={1}>
          {timezones.map(tz => {
            const timeStr = now.toLocaleTimeString('en-US', { timeZone: tz.zone, hour12:false });
            return (
              <Grid item xs={6} key={tz.zone}>
                <Typography variant="caption" color="text.secondary">{tz.label}</Typography>
                <Typography variant="subtitle1" sx={{ fontFamily:'monospace' }}>{timeStr}</Typography>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ClockWidget;
