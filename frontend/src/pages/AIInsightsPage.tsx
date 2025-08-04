import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import axios from 'axios';

const AIInsightsPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [sentiment, setSentiment] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [error, setError] = useState<string>('');

  const handleQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await axios.post('/api/ai-insights/query', {
        query,
        tradingData: {
          portfolio: { totalValue: 10000 },
          trades: [
            { pnl: 150, amount: 1000 },
            { pnl: -50, amount: 500 },
            { pnl: 200, amount: 1200 }
          ]
        }
      });

      setResponse(result.data.response);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process query');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await axios.post('/api/ai-insights/report', {
        tradingData: {
          portfolio: { totalValue: 10000 },
          trades: [
            { pnl: 150, amount: 1000 },
            { pnl: -50, amount: 500 },
            { pnl: 200, amount: 1200 }
          ]
        }
      });

      setReport(result.data.report);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const fetchSentiment = async () => {
    try {
      const result = await axios.get('/api/ai-insights/sentiment?symbols=BTC,ETH,ADA');
      setSentiment(result.data.data);
    } catch (err: any) {
      console.error('Failed to fetch sentiment:', err);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const result = await axios.post('/api/ai-insights/suggestions', {
        portfolio: { totalValue: 10000 },
        riskTolerance: 'medium'
      });
      setSuggestions(result.data.suggestions);
    } catch (err: any) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  useEffect(() => {
    fetchSentiment();
    fetchSuggestions();
  }, []);

  const quickQuestions = [
    "How is my portfolio performing?",
    "What's the prediction for BTC?",
    "What's my current risk level?",
    "Which strategy should I use?",
    "How is the market sentiment?"
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PsychologyIcon color="primary" />
        AI-Powered Insights
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Natural Language Query Section */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ask AI Anything About Your Trading
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Ask a question about your trading performance, market conditions, or strategies"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
                  placeholder="e.g., How is my portfolio performing this month?"
                  multiline
                  rows={2}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {quickQuestions.map((question, index) => (
                  <Chip
                    key={index}
                    label={question}
                    onClick={() => setQuery(question)}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>

              <Button
                variant="contained"
                onClick={handleQuery}
                disabled={loading || !query.trim()}
                startIcon={loading ? <CircularProgress size={16} /> : <PsychologyIcon />}
              >
                {loading ? 'Analyzing...' : 'Ask AI'}
              </Button>

              {response && (
                <Paper sx={{ mt: 3, p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    AI Response ({response.intent})
                  </Typography>
                  <Typography paragraph>
                    {response.answer}
                  </Typography>
                  
                  {response.data && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Supporting Data:
                      </Typography>
                      <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                        {JSON.stringify(response.data, null, 2)}
                      </pre>
                    </Box>
                  )}

                  {response.suggestions && response.suggestions.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Follow-up Questions:
                      </Typography>
                      {response.suggestions.map((suggestion: string, index: number) => (
                        <Chip
                          key={index}
                          label={suggestion}
                          onClick={() => setQuery(suggestion)}
                          variant="outlined"
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Market Sentiment Panel */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon />
                Market Sentiment
              </Typography>
              
              {sentiment ? (
                <Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Overall Sentiment
                    </Typography>
                    <Typography variant="h6" color={
                      sentiment.overall.overall === 'Bullish' ? 'success.main' :
                      sentiment.overall.overall === 'Bearish' ? 'error.main' : 'warning.main'
                    }>
                      {sentiment.overall.overall} ({sentiment.overall.score}%)
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    By Symbol:
                  </Typography>
                  {Object.entries(sentiment.bySymbol).map(([symbol, data]: [string, any]) => (
                    <Box key={symbol} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">{symbol}</Typography>
                      <Chip
                        label={`${data.sentiment} ${data.confidence}%`}
                        size="small"
                        color={data.trending ? 'primary' : 'default'}
                      />
                    </Box>
                  ))}

                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Last updated: {new Date(sentiment.lastUpdated).toLocaleTimeString()}
                  </Typography>
                </Box>
              ) : (
                <CircularProgress size={24} />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* AI Report Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssessmentIcon />
                  AI-Generated Trading Report
                </Typography>
                <Button
                  variant="outlined"
                  onClick={generateReport}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : <AssessmentIcon />}
                >
                  Generate Report
                </Button>
              </Box>

              {report && (
                <Box>
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Executive Summary</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>{report.summary.message}</Typography>
                      <List dense>
                        {report.summary.keyPoints.map((point: string, index: number) => (
                          <ListItem key={index}>
                            <ListItemText primary={point} />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Performance Analysis</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>{report.performance.answer}</Typography>
                      {report.performance.data && (
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="textSecondary">Total P&L</Typography>
                            <Typography variant="h6">${report.performance.data.totalPnL}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="textSecondary">Win Rate</Typography>
                            <Typography variant="h6">{report.performance.data.winRate}%</Typography>
                          </Grid>
                        </Grid>
                      )}
                    </AccordionDetails>
                  </Accordion>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Recommendations</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {report.recommendations.map((rec: any, index: number) => (
                        <Paper key={index} sx={{ p: 2, mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2">{rec.title}</Typography>
                            <Chip label={rec.priority} size="small" color={
                              rec.priority === 'high' ? 'error' :
                              rec.priority === 'medium' ? 'warning' : 'success'
                            } />
                          </Box>
                          <Typography variant="body2" paragraph>{rec.description}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            Impact: {rec.impact}
                          </Typography>
                        </Paper>
                      ))}
                    </AccordionDetails>
                  </Accordion>

                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Report Confidence
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {report.confidence.overall}%
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Generated: {new Date(report.generatedAt).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LightbulbIcon />
                  AI Trading Suggestions
                </Typography>
                
                <Grid container spacing={2}>
                  {suggestions.map((suggestion, index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Paper sx={{ p: 2, height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2">{suggestion.action}</Typography>
                          <Chip 
                            label={`${suggestion.confidence}%`} 
                            size="small" 
                            color="primary"
                          />
                        </Box>
                        <Typography variant="body2" paragraph>
                          {suggestion.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip label={suggestion.timeframe} size="small" variant="outlined" />
                          <Chip label={suggestion.riskLevel} size="small" variant="outlined" />
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                <Alert severity="info" sx={{ mt: 2 }}>
                  These are AI-generated suggestions and should not be considered as financial advice. 
                  Always do your own research before making trading decisions.
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AIInsightsPage;