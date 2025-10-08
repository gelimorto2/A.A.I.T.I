import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Avatar,
  Stack,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Collapse
} from '@mui/material';
import {
  Search,
  FilterList,
  MoreVert,
  Visibility,
  Edit,
  Delete,
  Download,
  Assessment,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  ErrorOutline,
  Schedule,
  Memory,
  Speed,
  Accuracy,
  ExpandMore,
  ExpandLess,
  Compare,
  Refresh,
  CloudDownload
} from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';

interface ModelData {
  id: string;
  version: string;
  status: 'active' | 'inactive' | 'training' | 'error' | 'archived';
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  recentAccuracy: number;
  totalPredictions: number;
  drift: number;
  latency: number;
  memoryUsage: number;
  needsRetraining: boolean;
  lastUpdated: string;
  createdAt: string;
  confidenceAvg: number;
  errorRate: number;
  trainingTime: number;
  datasetSize: number;
  features: number;
  hyperparameters: Record<string, any>;
  metrics: {
    auc: number;
    mae: number;
    mse: number;
    r2: number;
  };
}

type Order = 'asc' | 'desc';

interface HeadCell {
  disablePadding: boolean;
  id: keyof ModelData | 'actions';
  label: string;
  numeric: boolean;
  width?: string;
}

const headCells: readonly HeadCell[] = [
  { id: 'id', numeric: false, disablePadding: false, label: 'Model ID', width: '150px' },
  { id: 'version', numeric: false, disablePadding: false, label: 'Version', width: '100px' },
  { id: 'status', numeric: false, disablePadding: false, label: 'Status', width: '120px' },
  { id: 'accuracy', numeric: true, disablePadding: false, label: 'Accuracy', width: '100px' },
  { id: 'f1Score', numeric: true, disablePadding: false, label: 'F1 Score', width: '100px' },
  { id: 'drift', numeric: true, disablePadding: false, label: 'Drift', width: '100px' },
  { id: 'latency', numeric: true, disablePadding: false, label: 'Latency (ms)', width: '120px' },
  { id: 'totalPredictions', numeric: true, disablePadding: false, label: 'Predictions', width: '120px' },
  { id: 'lastUpdated', numeric: false, disablePadding: false, label: 'Last Updated', width: '150px' },
  { id: 'actions', numeric: false, disablePadding: false, label: 'Actions', width: '120px' }
];

interface ModelPerformanceTableProps {
  models: ModelData[];
  onViewDetails: (modelId: string) => void;
  onEditModel: (modelId: string) => void;
  onDeleteModel: (modelId: string) => void;
  onCompareModels: (modelIds: string[]) => void;
  onRetrainModel: (modelId: string) => void;
}

const ModelPerformanceTable: React.FC<ModelPerformanceTableProps> = ({
  models,
  onViewDetails,
  onEditModel,
  onDeleteModel,
  onCompareModels,
  onRetrainModel
}) => {
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof ModelData>('lastUpdated');
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedModelDetails, setSelectedModelDetails] = useState<ModelData | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof ModelData) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = filteredModels.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event: React.MouseEvent<unknown>, id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, modelId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedModelId(modelId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedModelId('');
  };

  const handleViewDetailsClick = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (model) {
      setSelectedModelDetails(model);
      setDetailsOpen(true);
    }
    handleMenuClose();
  };

  const handleExpandRow = (modelId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelId)) {
        newSet.delete(modelId);
      } else {
        newSet.add(modelId);
      }
      return newSet;
    });
  };

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  const filteredModels = useMemo(() => {
    return models.filter(model => {
      const matchesSearch = model.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          model.version.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || model.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [models, searchTerm, filterStatus]);

  const sortedModels = useMemo(() => {
    return [...filteredModels].sort((a, b) => {
      const aVal = a[orderBy];
      const bVal = b[orderBy];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });
  }, [filteredModels, order, orderBy]);

  const getStatusChip = (status: string) => {
    const statusConfig = {
      active: { color: 'success' as const, icon: <CheckCircle fontSize="small" /> },
      inactive: { color: 'default' as const, icon: <Schedule fontSize="small" /> },
      training: { color: 'info' as const, icon: <Refresh fontSize="small" /> },
      error: { color: 'error' as const, icon: <ErrorOutline fontSize="small" /> },
      archived: { color: 'warning' as const, icon: <CloudDownload fontSize="small" /> }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    
    return (
      <Chip
        label={status.toUpperCase()}
        color={config.color}
        size="small"
        icon={config.icon}
        variant="outlined"
      />
    );
  };

  const getAccuracyTrend = (current: number, recent: number) => {
    if (current > recent) {
      return <TrendingUp color="success" fontSize="small" />;
    } else if (current < recent) {
      return <TrendingDown color="error" fontSize="small" />;
    }
    return null;
  };

  const getDriftSeverity = (drift: number) => {
    if (drift > 0.3) return 'error';
    if (drift > 0.15) return 'warning';
    return 'success';
  };

  const formatNumber = (value: number, decimals: number = 3) => {
    return value.toFixed(decimals);
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const renderExpandedContent = (model: ModelData) => {
    return (
      <Box sx={{ p: 2, bgcolor: 'background.default' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              Performance Metrics
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Precision:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatNumber(model.precision)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Recall:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatNumber(model.recall)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">AUC:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatNumber(model.metrics.auc)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Error Rate:</Typography>
                <Typography variant="body2" fontWeight="medium" color="error.main">
                  {formatNumber(model.errorRate * 100, 2)}%
                </Typography>
              </Box>
            </Stack>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              System Metrics
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Memory Usage:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatBytes(model.memoryUsage)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Confidence Avg:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatNumber(model.confidenceAvg)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Training Time:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {model.trainingTime}s
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Dataset Size:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {model.datasetSize.toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              Model Info
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Features:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {model.features}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Created:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {new Date(model.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">MSE:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatNumber(model.metrics.mse)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">R²:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatNumber(model.metrics.r2)}
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>
        
        {model.needsRetraining && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="body2" color="warning.contrastText">
              <Warning fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
              This model may benefit from retraining due to performance degradation or data drift.
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="warning"
              startIcon={<Refresh />}
              sx={{ mt: 1 }}
              onClick={() => onRetrainModel(model.id)}
            >
              Schedule Retraining
            </Button>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search models..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Status"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="training">Training</MenuItem>
            <MenuItem value="error">Error</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
        </FormControl>

        {selected.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<Compare />}
            onClick={() => onCompareModels(selected as string[])}
          >
            Compare Selected ({selected.length})
          </Button>
        )}
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle" size="medium">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <input
                  type="checkbox"
                  indeterminate={selected.length > 0 && selected.length < filteredModels.length}
                  checked={filteredModels.length > 0 && selected.length === filteredModels.length}
                  onChange={handleSelectAllClick}
                />
              </TableCell>
              <TableCell width="50px"></TableCell> {/* Expand column */}
              {headCells.map((headCell) => (
                <TableCell
                  key={headCell.id}
                  align={headCell.numeric ? 'right' : 'left'}
                  padding={headCell.disablePadding ? 'none' : 'normal'}
                  sortDirection={orderBy === headCell.id ? order : false}
                  width={headCell.width}
                >
                  {headCell.id !== 'actions' ? (
                    <TableSortLabel
                      active={orderBy === headCell.id}
                      direction={orderBy === headCell.id ? order : 'asc'}
                      onClick={(event) => handleRequestSort(event, headCell.id as keyof ModelData)}
                    >
                      {headCell.label}
                      {orderBy === headCell.id ? (
                        <Box component="span" sx={visuallyHidden}>
                          {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                        </Box>
                      ) : null}
                    </TableSortLabel>
                  ) : (
                    headCell.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedModels.map((model) => {
              const isItemSelected = isSelected(model.id);
              const isExpanded = expandedRows.has(model.id);
              
              return (
                <React.Fragment key={model.id}>
                  <TableRow
                    hover
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    selected={isItemSelected}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        checked={isItemSelected}
                        onChange={(event) => handleClick(event, model.id)}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleExpandRow(model.id)}
                      >
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                          {model.id.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight="medium">
                          {model.id}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>{model.version}</TableCell>
                    
                    <TableCell>
                      {getStatusChip(model.status)}
                    </TableCell>
                    
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {formatNumber(model.accuracy * 100, 1)}%
                        </Typography>
                        {getAccuracyTrend(model.accuracy, model.recentAccuracy)}
                      </Box>
                    </TableCell>
                    
                    <TableCell align="right">
                      {formatNumber(model.f1Score)}
                    </TableCell>
                    
                    <TableCell align="right">
                      <Chip
                        label={formatNumber(model.drift)}
                        color={getDriftSeverity(model.drift)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <Speed fontSize="small" color="action" />
                        <Typography variant="body2">
                          {model.latency.toFixed(0)}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell align="right">
                      {model.totalPredictions.toLocaleString()}
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(model.lastUpdated).toLocaleString()}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, model.id)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={12}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        {renderExpandedContent(model)}
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {sortedModels.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Assessment sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No models found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm || filterStatus !== 'all' ? 
              'Try adjusting your search or filter criteria' : 
              'No models have been deployed yet'
            }
          </Typography>
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleViewDetailsClick(selectedModelId)}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { onEditModel(selectedModelId); handleMenuClose(); }}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { onRetrainModel(selectedModelId); handleMenuClose(); }}>
          <ListItemIcon>
            <Refresh fontSize="small" />
          </ListItemIcon>
          <ListItemText>Retrain</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { onDeleteModel(selectedModelId); handleMenuClose(); }}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Model Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Model Details - {selectedModelDetails?.id}
        </DialogTitle>
        <DialogContent>
          {selectedModelDetails && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Performance Metrics
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Accuracy
                        </Typography>
                        <Typography variant="h5">
                          {formatNumber(selectedModelDetails.accuracy * 100, 2)}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={selectedModelDetails.accuracy * 100} 
                          sx={{ mt: 1 }}
                        />
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          F1 Score
                        </Typography>
                        <Typography variant="h5">
                          {formatNumber(selectedModelDetails.f1Score)}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Drift Score
                        </Typography>
                        <Chip
                          label={formatNumber(selectedModelDetails.drift)}
                          color={getDriftSeverity(selectedModelDetails.drift)}
                          size="small"
                        />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      System Information
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Version
                        </Typography>
                        <Typography variant="body1">
                          {selectedModelDetails.version}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Status
                        </Typography>
                        {getStatusChip(selectedModelDetails.status)}
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Total Predictions
                        </Typography>
                        <Typography variant="body1">
                          {selectedModelDetails.totalPredictions.toLocaleString()}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Memory Usage
                        </Typography>
                        <Typography variant="body1">
                          {formatBytes(selectedModelDetails.memoryUsage)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModelPerformanceTable;
