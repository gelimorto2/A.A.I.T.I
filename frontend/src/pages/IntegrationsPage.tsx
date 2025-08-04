import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Tab,
  Tabs,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Code as CodeIcon,
  Webhook as WebhookIcon,
  Extension as ExtensionIcon,
  DataObject as DataObjectIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  BugReport as TestIcon
} from '@mui/icons-material';
import axios from 'axios';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const IntegrationsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // Dialog states
  const [webhookDialog, setWebhookDialog] = useState(false);
  const [pluginDialog, setPluginDialog] = useState(false);
  const [dataSourceDialog, setDataSourceDialog] = useState(false);
  const [zapierDialog, setZapierDialog] = useState(false);
  
  // Form states
  const [webhookForm, setWebhookForm] = useState({
    url: '',
    secret: '',
    events: ['*'],
    integrationType: 'custom'
  });
  
  const [pluginForm, setPluginForm] = useState({
    name: '',
    description: '',
    category: 'custom',
    code: ''
  });
  
  const [dataSourceForm, setDataSourceForm] = useState({
    name: '',
    type: 'api',
    endpoint: '',
    refreshInterval: 300000
  });

  const [zapierForm, setZapierForm] = useState({
    webhookUrl: '',
    triggerType: 'trade_executed',
    targetApp: ''
  });

  useEffect(() => {
    fetchWebhooks();
    fetchPlugins();
    fetchDataSources();
    fetchStats();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const response = await axios.get('/api/integrations/webhooks');
      setWebhooks(response.data.webhooks);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    }
  };

  const fetchPlugins = async () => {
    try {
      const response = await axios.get('/api/integrations/plugins');
      setPlugins(response.data.plugins);
    } catch (error) {
      console.error('Failed to fetch plugins:', error);
    }
  };

  const fetchDataSources = async () => {
    try {
      const response = await axios.get('/api/integrations/data-sources');
      setDataSources(response.data.dataSources);
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/integrations/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const createWebhook = async () => {
    try {
      await axios.post('/api/integrations/webhooks', webhookForm);
      setWebhookDialog(false);
      setWebhookForm({ url: '', secret: '', events: ['*'], integrationType: 'custom' });
      fetchWebhooks();
    } catch (error) {
      console.error('Failed to create webhook:', error);
    }
  };

  const createZapierIntegration = async () => {
    try {
      await axios.post('/api/integrations/webhooks/zapier', zapierForm);
      setZapierDialog(false);
      setZapierForm({ webhookUrl: '', triggerType: 'trade_executed', targetApp: '' });
      fetchWebhooks();
    } catch (error) {
      console.error('Failed to create Zapier integration:', error);
    }
  };

  const createPlugin = async () => {
    try {
      await axios.post('/api/integrations/plugins', pluginForm);
      setPluginDialog(false);
      setPluginForm({ name: '', description: '', category: 'custom', code: '' });
      fetchPlugins();
    } catch (error) {
      console.error('Failed to create plugin:', error);
    }
  };

  const createDataSource = async () => {
    try {
      await axios.post('/api/integrations/data-sources', dataSourceForm);
      setDataSourceDialog(false);
      setDataSourceForm({ name: '', type: 'api', endpoint: '', refreshInterval: 300000 });
      fetchDataSources();
    } catch (error) {
      console.error('Failed to create data source:', error);
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      await axios.delete(`/api/integrations/webhooks/${id}`);
      fetchWebhooks();
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  };

  const deletePlugin = async (id: string) => {
    try {
      await axios.delete(`/api/integrations/plugins/${id}`);
      fetchPlugins();
    } catch (error) {
      console.error('Failed to delete plugin:', error);
    }
  };

  const testWebhook = async (id: string) => {
    try {
      const response = await axios.post(`/api/integrations/webhooks/${id}/test`);
      alert(response.data.success ? 'Webhook test successful!' : 'Webhook test failed');
    } catch (error) {
      alert('Webhook test failed');
    }
  };

  const executePlugin = async (id: string) => {
    try {
      const sampleData = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109];
      const response = await axios.post(`/api/integrations/plugins/${id}/execute`, {
        data: sampleData,
        parameters: {}
      });
      alert(`Plugin executed successfully. Result: ${JSON.stringify(response.data.result.result, null, 2)}`);
    } catch (error) {
      alert('Plugin execution failed');
    }
  };

  const samplePluginCode = `// Sample RSI Indicator Plugin
const period = parameters.period || 14;

if (!data || data.length < period + 1) {
  result = { error: 'Insufficient data points' };
} else {
  const rsi = api.utils.rsi(data, period);
  result = {
    rsi: rsi,
    signal: rsi > 70 ? 'SELL' : rsi < 30 ? 'BUY' : 'HOLD',
    overbought: rsi > 70,
    oversold: rsi < 30
  };
}`;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ExtensionIcon color="primary" />
        Integration Ecosystem
      </Typography>

      {stats && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Total Integrations: {stats.overall.totalIntegrations} | 
          Webhooks: {stats.webhooks.total.webhooks} | 
          Plugins: {stats.plugins.totalPlugins} | 
          Data Sources: {stats.webhooks.total.dataSources}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Webhooks" icon={<WebhookIcon />} />
          <Tab label="Plugins" icon={<CodeIcon />} />
          <Tab label="Data Sources" icon={<DataObjectIcon />} />
        </Tabs>
      </Box>

      {/* Webhooks Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setWebhookDialog(true)}
          >
            Add Webhook
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExtensionIcon />}
            onClick={() => setZapierDialog(true)}
          >
            Add Zapier Integration
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>URL</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Events</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell>{webhook.url}</TableCell>
                  <TableCell>
                    <Chip label={webhook.integrationType} size="small" />
                  </TableCell>
                  <TableCell>
                    {webhook.events.slice(0, 2).map((event: string) => (
                      <Chip key={event} label={event} size="small" sx={{ mr: 0.5 }} />
                    ))}
                    {webhook.events.length > 2 && <Chip label={`+${webhook.events.length - 2}`} size="small" />}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={webhook.enabled ? 'Active' : 'Inactive'} 
                      color={webhook.enabled ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => testWebhook(webhook.id)} size="small">
                      <TestIcon />
                    </IconButton>
                    <IconButton onClick={() => deleteWebhook(webhook.id)} size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Plugins Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setPluginDialog(true)}
          >
            Create Plugin
          </Button>
        </Box>

        <Grid container spacing={3}>
          {plugins.map((plugin) => (
            <Grid item xs={12} md={6} lg={4} key={plugin.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{plugin.name}</Typography>
                    <Chip 
                      label={plugin.enabled ? 'Enabled' : 'Disabled'} 
                      color={plugin.enabled ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {plugin.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip label={plugin.category} size="small" variant="outlined" />
                    <Chip label={`v${plugin.version}`} size="small" variant="outlined" />
                  </Box>

                  <Typography variant="caption" color="textSecondary" paragraph>
                    Executions: {plugin.executionCount} | 
                    Avg Time: {plugin.averageExecutionTime.toFixed(2)}ms
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<PlayIcon />}
                      onClick={() => executePlugin(plugin.id)}
                      disabled={!plugin.enabled}
                    >
                      Test
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => deletePlugin(plugin.id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Data Sources Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDataSourceDialog(true)}
          >
            Add Data Source
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Endpoint</TableCell>
                <TableCell>Last Fetch</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dataSources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>{source.name}</TableCell>
                  <TableCell>
                    <Chip label={source.type} size="small" />
                  </TableCell>
                  <TableCell>{source.endpoint}</TableCell>
                  <TableCell>
                    {source.lastFetch ? new Date(source.lastFetch).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={source.enabled ? 'Active' : 'Inactive'} 
                      color={source.enabled ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Webhook Dialog */}
      <Dialog open={webhookDialog} onClose={() => setWebhookDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Webhook</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Webhook URL"
            value={webhookForm.url}
            onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Secret (optional)"
            value={webhookForm.secret}
            onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Integration Type</InputLabel>
            <Select
              value={webhookForm.integrationType}
              onChange={(e) => setWebhookForm({ ...webhookForm, integrationType: e.target.value })}
            >
              <MenuItem value="custom">Custom</MenuItem>
              <MenuItem value="discord">Discord</MenuItem>
              <MenuItem value="slack">Slack</MenuItem>
              <MenuItem value="telegram">Telegram</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWebhookDialog(false)}>Cancel</Button>
          <Button onClick={createWebhook} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Zapier Dialog */}
      <Dialog open={zapierDialog} onClose={() => setZapierDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Zapier Integration</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Zapier Webhook URL"
            value={zapierForm.webhookUrl}
            onChange={(e) => setZapierForm({ ...zapierForm, webhookUrl: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Trigger Type</InputLabel>
            <Select
              value={zapierForm.triggerType}
              onChange={(e) => setZapierForm({ ...zapierForm, triggerType: e.target.value })}
            >
              <MenuItem value="trade_executed">Trade Executed</MenuItem>
              <MenuItem value="alert_triggered">Alert Triggered</MenuItem>
              <MenuItem value="portfolio_update">Portfolio Update</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Target App (optional)"
            value={zapierForm.targetApp}
            onChange={(e) => setZapierForm({ ...zapierForm, targetApp: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setZapierDialog(false)}>Cancel</Button>
          <Button onClick={createZapierIntegration} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Plugin Dialog */}
      <Dialog open={pluginDialog} onClose={() => setPluginDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Custom Plugin</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Plugin Name"
            value={pluginForm.name}
            onChange={(e) => setPluginForm({ ...pluginForm, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            value={pluginForm.description}
            onChange={(e) => setPluginForm({ ...pluginForm, description: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Category</InputLabel>
            <Select
              value={pluginForm.category}
              onChange={(e) => setPluginForm({ ...pluginForm, category: e.target.value })}
            >
              <MenuItem value="custom">Custom</MenuItem>
              <MenuItem value="technical_indicators">Technical Indicators</MenuItem>
              <MenuItem value="analysis">Analysis</MenuItem>
              <MenuItem value="alerts">Alerts</MenuItem>
            </Select>
          </FormControl>
          
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Sample Plugin Code</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {samplePluginCode}
              </pre>
            </AccordionDetails>
          </Accordion>

          <TextField
            fullWidth
            label="Plugin Code"
            value={pluginForm.code}
            onChange={(e) => setPluginForm({ ...pluginForm, code: e.target.value })}
            margin="normal"
            multiline
            rows={10}
            placeholder="Enter your plugin code here..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPluginDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => setPluginForm({ ...pluginForm, code: samplePluginCode })}
            variant="outlined"
          >
            Use Sample
          </Button>
          <Button onClick={createPlugin} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Data Source Dialog */}
      <Dialog open={dataSourceDialog} onClose={() => setDataSourceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Data Source</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Data Source Name"
            value={dataSourceForm.name}
            onChange={(e) => setDataSourceForm({ ...dataSourceForm, name: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              value={dataSourceForm.type}
              onChange={(e) => setDataSourceForm({ ...dataSourceForm, type: e.target.value })}
            >
              <MenuItem value="api">API</MenuItem>
              <MenuItem value="rss">RSS Feed</MenuItem>
              <MenuItem value="websocket">WebSocket</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Endpoint URL"
            value={dataSourceForm.endpoint}
            onChange={(e) => setDataSourceForm({ ...dataSourceForm, endpoint: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Refresh Interval (ms)"
            type="number"
            value={dataSourceForm.refreshInterval}
            onChange={(e) => setDataSourceForm({ ...dataSourceForm, refreshInterval: parseInt(e.target.value) })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDataSourceDialog(false)}>Cancel</Button>
          <Button onClick={createDataSource} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IntegrationsPage;