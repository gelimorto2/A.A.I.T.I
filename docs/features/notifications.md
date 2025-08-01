# Notifications Guide

Comprehensive notification and alerting system for A.A.I.T.I v1.2.1. Stay informed about trading activities, system events, and performance milestones.

## 🔔 Notification Overview

A.A.I.T.I's notification system provides:

- **Real-time Alerts**: Instant notifications for critical events
- **Multiple Delivery Channels**: Email, webhooks, in-app notifications
- **Smart Filtering**: Reduce noise with intelligent alert prioritization
- **Custom Triggers**: Create personalized alert conditions
- **Escalation Rules**: Automatic escalation for critical issues
- **Mobile Support**: Push notifications and SMS (via webhooks)

## 📧 Email Notifications

### Email Configuration

Set up SMTP for email notifications:

```javascript
// Email configuration
{
  "email": {
    "enabled": true,
    "provider": "smtp",
    "smtp": {
      "host": "smtp.gmail.com",
      "port": 587,
      "secure": false,
      "auth": {
        "user": "your-email@gmail.com",
        "pass": "your-app-password"
      }
    },
    "from": {
      "name": "A.A.I.T.I Trading System",
      "address": "noreply@your-domain.com"
    },
    "templates": {
      "enabled": true,
      "customTemplates": true,
      "includeCharts": true,
      "branding": true
    }
  }
}
```

### Email Templates

#### Trade Execution Email

```html
<!-- Trade execution email template -->
<!DOCTYPE html>
<html>
<head>
    <title>Trade Executed - A.A.I.T.I</title>
    <style>
        .header { background: #1976d2; color: white; padding: 20px; }
        .content { padding: 20px; font-family: Arial, sans-serif; }
        .trade-info { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .profit { color: #4caf50; font-weight: bold; }
        .loss { color: #f44336; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 Trade Executed</h1>
        <p>{{botName}} - {{timestamp}}</p>
    </div>
    <div class="content">
        <div class="trade-info">
            <h3>Trade Details</h3>
            <ul>
                <li><strong>Action:</strong> {{action}} {{amount}} {{symbol}}</li>
                <li><strong>Price:</strong> ${{price}}</li>
                <li><strong>P&L:</strong> <span class="{{pnlClass}}">${{pnl}}</span></li>
                <li><strong>Confidence:</strong> {{confidence}}%</li>
                <li><strong>Strategy:</strong> {{strategy}}</li>
            </ul>
        </div>
        <p><a href="{{dashboardUrl}}">View Dashboard</a></p>
    </div>
</body>
</html>
```

#### Daily Performance Report Email

```html
<!-- Daily performance email template -->
<!DOCTYPE html>
<html>
<head>
    <title>Daily Performance Report - A.A.I.T.I</title>
</head>
<body>
    <div class="header">
        <h1>📊 Daily Performance Report</h1>
        <p>{{date}}</p>
    </div>
    <div class="content">
        <h3>Portfolio Summary</h3>
        <table>
            <tr><td>Total Return:</td><td class="{{returnClass}}">${{totalReturn}}</td></tr>
            <tr><td>Win Rate:</td><td>{{winRate}}%</td></tr>
            <tr><td>Best Bot:</td><td>{{bestBot}}</td></tr>
            <tr><td>Total Trades:</td><td>{{totalTrades}}</td></tr>
        </table>
        
        <h3>Top Performing Bots</h3>
        <ul>
            {{#each topBots}}
            <li>{{name}}: <span class="profit">${{pnl}}</span></li>
            {{/each}}
        </ul>
        
        {{#if alerts}}
        <h3>⚠️ Alerts</h3>
        <ul>
            {{#each alerts}}
            <li class="alert-{{severity}}">{{message}}</li>
            {{/each}}
        </ul>
        {{/if}}
    </div>
</body>
</html>
```

### Email Alert Types

#### Trading Alerts
```javascript
{
  "tradeExecution": {
    "enabled": true,
    "allTrades": false,
    "profitableOnly": false,
    "minAmount": 100,
    "strategies": ["all"],
    "template": "trade_execution"
  },
  "positionUpdates": {
    "enabled": true,
    "openPosition": true,
    "closePosition": true,
    "stopLossHit": true,
    "takeProfitHit": true
  }
}
```

#### Performance Alerts
```javascript
{
  "performanceAlerts": {
    "dailyProfit": {
      "enabled": true,
      "threshold": 500,
      "frequency": "once_per_day"
    },
    "dailyLoss": {
      "enabled": true,
      "threshold": -200,
      "frequency": "immediate"
    },
    "weeklyReport": {
      "enabled": true,
      "day": "sunday",
      "time": "09:00"
    },
    "monthlyReport": {
      "enabled": true,
      "day": 1,
      "time": "08:00"
    }
  }
}
```

#### System Alerts
```javascript
{
  "systemAlerts": {
    "botStopped": {
      "enabled": true,
      "severity": "high",
      "escalation": true
    },
    "connectionLost": {
      "enabled": true,
      "severity": "critical",
      "retryAttempts": 3
    },
    "highMemoryUsage": {
      "enabled": true,
      "threshold": 0.85,
      "severity": "medium"
    },
    "databaseError": {
      "enabled": true,
      "severity": "critical",
      "escalation": true
    }
  }
}
```

## 🔗 Webhook Notifications

### Webhook Configuration

Set up webhooks for external system integration:

```javascript
// Webhook configuration
{
  "webhooks": {
    "enabled": true,
    "endpoints": [
      {
        "name": "Slack Trading Channel",
        "url": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
        "events": ["trade_executed", "bot_stopped", "high_profit"],
        "authentication": {
          "type": "bearer",
          "token": "your-webhook-token"
        },
        "format": "slack",
        "retryPolicy": {
          "maxRetries": 3,
          "retryDelay": 5000,
          "backoffMultiplier": 2
        }
      },
      {
        "name": "Discord Alerts",
        "url": "https://discord.com/api/webhooks/123456789/abcdefghijklmnop",
        "events": ["all"],
        "format": "discord",
        "filters": {
          "minSeverity": "medium",
          "bots": ["btc-momentum-001", "eth-scalper-002"]
        }
      },
      {
        "name": "Custom API",
        "url": "https://api.your-service.com/aaiti-alerts",
        "events": ["trade_executed", "performance_milestone"],
        "authentication": {
          "type": "api_key",
          "header": "X-API-Key",
          "value": "your-api-key"
        },
        "format": "json",
        "customHeaders": {
          "Content-Type": "application/json",
          "User-Agent": "AAITI-Webhook/1.0"
        }
      }
    ]
  }
}
```

### Webhook Payloads

#### Trade Execution Webhook

```javascript
// Trade execution webhook payload
{
  "event": "trade_executed",
  "timestamp": "2025-01-08T15:30:00Z",
  "severity": "info",
  "data": {
    "tradeId": "trade_12345",
    "botId": "btc-momentum-001",
    "botName": "BTC Momentum Bot",
    "symbol": "BTC",
    "action": "BUY",
    "amount": 0.025,
    "price": 43250.50,
    "pnl": 127.83,
    "confidence": 0.78,
    "strategy": "momentum",
    "entryTime": "2025-01-08T15:29:45Z",
    "exitTime": "2025-01-08T15:30:00Z",
    "holdDuration": "15 seconds",
    "fees": 2.16
  },
  "context": {
    "portfolioValue": 125847.30,
    "dailyPnL": 1247.56,
    "botStatus": "ACTIVE",
    "marketConditions": {
      "btcPrice": 43250.50,
      "volatility": 0.034,
      "trend": "BULLISH"
    }
  }
}
```

#### System Alert Webhook

```javascript
// System alert webhook payload
{
  "event": "system_alert",
  "timestamp": "2025-01-08T15:30:00Z",
  "severity": "high",
  "alertType": "bot_stopped",
  "data": {
    "botId": "eth-scalper-002",
    "botName": "ETH Scalper Bot",
    "reason": "STOP_LOSS_LIMIT_REACHED",
    "details": {
      "dailyLoss": -156.78,
      "dailyLossLimit": -150.00,
      "consecutiveLosses": 5,
      "lastTrade": {
        "symbol": "ETH",
        "action": "SELL",
        "pnl": -34.56,
        "time": "2025-01-08T15:29:30Z"
      }
    }
  },
  "recommended_action": "Review bot parameters and market conditions",
  "dashboard_url": "https://your-domain.com/bots/eth-scalper-002"
}
```

#### Performance Milestone Webhook

```javascript
// Performance milestone webhook payload
{
  "event": "performance_milestone",
  "timestamp": "2025-01-08T15:30:00Z",
  "severity": "info",
  "milestone": "monthly_profit_target",
  "data": {
    "period": "2025-01",
    "target": 5000,
    "achieved": 5247.83,
    "percentage": 104.96,
    "daysToTarget": 8,
    "totalReturn": 0.0525,
    "bestBot": "btc-momentum-001",
    "topStrategies": [
      { "name": "momentum", "contribution": 0.45 },
      { "name": "ml_driven", "contribution": 0.32 }
    ]
  }
}
```

### Webhook Formats

#### Slack Format

```javascript
// Slack webhook payload
{
  "text": "🚀 Trade Executed",
  "attachments": [
    {
      "color": "good",
      "fields": [
        {
          "title": "Bot",
          "value": "BTC Momentum Bot",
          "short": true
        },
        {
          "title": "Action",
          "value": "BUY 0.025 BTC @ $43,250.50",
          "short": true
        },
        {
          "title": "P&L",
          "value": "+$127.83",
          "short": true
        },
        {
          "title": "Confidence",
          "value": "78%",
          "short": true
        }
      ],
      "footer": "A.A.I.T.I Trading System",
      "ts": 1704726600
    }
  ]
}
```

#### Discord Format

```javascript
// Discord webhook payload
{
  "embeds": [
    {
      "title": "🤖 Trade Executed",
      "description": "BTC Momentum Bot executed a trade",
      "color": 3066993,
      "fields": [
        {
          "name": "Symbol",
          "value": "BTC",
          "inline": true
        },
        {
          "name": "Action",
          "value": "BUY 0.025",
          "inline": true
        },
        {
          "name": "Price",
          "value": "$43,250.50",
          "inline": true
        },
        {
          "name": "P&L",
          "value": "+$127.83",
          "inline": true
        }
      ],
      "footer": {
        "text": "A.A.I.T.I Trading System"
      },
      "timestamp": "2025-01-08T15:30:00Z"
    }
  ]
}
```

## 📱 In-App Notifications

### Real-Time In-App Alerts

Browser-based notifications with WebSocket delivery:

#### Notification Center

```javascript
// In-app notification structure
{
  "notifications": [
    {
      "id": "notif_12345",
      "type": "trade_executed",
      "severity": "info",
      "title": "Trade Executed",
      "message": "BTC Momentum Bot bought 0.025 BTC for $127.83 profit",
      "timestamp": "2025-01-08T15:30:00Z",
      "read": false,
      "actions": [
        {
          "label": "View Trade",
          "action": "navigate",
          "target": "/trades/trade_12345"
        },
        {
          "label": "View Bot",
          "action": "navigate", 
          "target": "/bots/btc-momentum-001"
        }
      ],
      "metadata": {
        "botId": "btc-momentum-001",
        "tradeId": "trade_12345",
        "symbol": "BTC"
      }
    }
  ]
}
```

#### Notification Types

```javascript
// In-app notification categories
{
  "notificationTypes": {
    "trades": {
      "icon": "trending_up",
      "color": "success",
      "sound": "trade_success.mp3",
      "priority": "normal"
    },
    "alerts": {
      "icon": "warning",
      "color": "warning",
      "sound": "alert.mp3",
      "priority": "high"
    },
    "system": {
      "icon": "settings",
      "color": "info",
      "sound": "notification.mp3",
      "priority": "low"
    },
    "errors": {
      "icon": "error",
      "color": "error",
      "sound": "error.mp3",
      "priority": "critical"
    }
  }
}
```

### Browser Notifications

Push notifications to the browser:

```javascript
// Browser notification request
if ('Notification' in window && Notification.permission === 'granted') {
  const notification = new Notification('A.A.I.T.I Alert', {
    body: 'BTC Momentum Bot executed a profitable trade (+$127.83)',
    icon: '/favicon.ico',
    badge: '/badge-icon.png',
    tag: 'trade-alert',
    requireInteraction: false,
    silent: false,
    data: {
      botId: 'btc-momentum-001',
      tradeId: 'trade_12345',
      url: '/trades/trade_12345'
    }
  });

  notification.onclick = function(event) {
    event.preventDefault();
    window.focus();
    window.location.href = event.target.data.url;
  };
}
```

## 🎯 Smart Alert System

### Alert Prioritization

Intelligent alert filtering and prioritization:

```javascript
// Smart alert configuration
{
  "smartAlerts": {
    "enabled": true,
    "prioritization": {
      "algorithm": "importance_score",
      "factors": {
        "severity": 0.4,        // 40% weight
        "frequency": 0.2,       // 20% weight
        "userAction": 0.2,      // 20% weight
        "performance": 0.2      // 20% weight
      }
    },
    "filtering": {
      "duplicateWindow": 300,   // 5 minutes
      "rateLimit": {
        "maxPerHour": 20,
        "maxPerDay": 100
      },
      "quietHours": {
        "enabled": true,
        "start": "22:00",
        "end": "07:00",
        "timezone": "UTC",
        "emergencyOverride": true
      }
    },
    "escalation": {
      "enabled": true,
      "rules": [
        {
          "condition": "critical_severity",
          "delay": 0,
          "channels": ["email", "webhook", "sms"]
        },
        {
          "condition": "no_acknowledgment",
          "delay": 900,  // 15 minutes
          "escalateTo": "admin_email"
        }
      ]
    }
  }
}
```

### Alert Grouping

Group related alerts to reduce noise:

```javascript
// Alert grouping configuration
{
  "grouping": {
    "enabled": true,
    "rules": [
      {
        "name": "Bot Performance Issues",
        "conditions": {
          "alertTypes": ["bot_stopped", "high_loss", "connection_error"],
          "timeWindow": 600,  // 10 minutes
          "sameBot": true
        },
        "groupMessage": "Multiple issues detected with {{botName}}",
        "maxAlerts": 5
      },
      {
        "name": "Market Volatility",
        "conditions": {
          "alertTypes": ["high_volatility", "stop_loss_hit"],
          "timeWindow": 300,  // 5 minutes
          "sameSymbol": true
        },
        "groupMessage": "High volatility detected for {{symbol}}",
        "maxAlerts": 10
      }
    ]
  }
}
```

### Machine Learning Alert Optimization

Use ML to optimize alert relevance:

```javascript
// ML-powered alert optimization
{
  "mlOptimization": {
    "enabled": true,
    "model": "alert_relevance_classifier",
    "features": [
      "user_action_history",
      "alert_frequency",
      "time_of_day",
      "portfolio_context",
      "market_conditions"
    ],
    "training": {
      "autoRetrain": true,
      "retrainInterval": "weekly",
      "minSamples": 1000
    },
    "predictions": {
      "relevanceThreshold": 0.7,
      "confidenceThreshold": 0.8,
      "fallbackToRules": true
    }
  }
}
```

## 📊 Notification Analytics

### Alert Performance Metrics

Track notification effectiveness:

```javascript
// Notification analytics
{
  "analytics": {
    "deliveryStats": {
      "email": {
        "sent": 1234,
        "delivered": 1198,
        "opened": 856,
        "clicked": 234,
        "deliveryRate": 0.971,
        "openRate": 0.714,
        "clickRate": 0.273
      },
      "webhook": {
        "sent": 2345,
        "successful": 2298,
        "failed": 47,
        "retried": 23,
        "successRate": 0.980
      },
      "inApp": {
        "sent": 3456,
        "viewed": 2987,
        "clicked": 1234,
        "dismissed": 1098,
        "viewRate": 0.864
      }
    },
    "userEngagement": {
      "averageResponseTime": "2.3 minutes",
      "alertsPerUser": 23.4,
      "mostEngagingType": "trade_executed",
      "leastEngagingType": "system_info"
    },
    "alertEffectiveness": {
      "criticalAlertsAcknowledged": 0.95,
      "falsePositiveRate": 0.12,
      "userSatisfactionScore": 4.2
    }
  }
}
```

### A/B Testing for Alerts

Test different alert formats and timing:

```javascript
// A/B testing configuration
{
  "abTesting": {
    "enabled": true,
    "experiments": [
      {
        "name": "Alert Timing Optimization",
        "variants": [
          {
            "name": "Immediate",
            "config": { "delay": 0 },
            "allocation": 0.33
          },
          {
            "name": "Batched 5min",
            "config": { "delay": 300, "batchSize": 5 },
            "allocation": 0.33
          },
          {
            "name": "Smart Timing",
            "config": { "useMLTiming": true },
            "allocation": 0.34
          }
        ],
        "metrics": ["engagement_rate", "response_time", "satisfaction"],
        "duration": 30 // days
      }
    ]
  }
}
```

## 🛠 Custom Notification Rules

### Rule Builder Interface

Create custom notification rules:

```javascript
// Custom rule example
{
  "ruleName": "High Profit Trade Alert",
  "enabled": true,
  "conditions": {
    "operator": "AND",
    "rules": [
      {
        "field": "trade.pnl",
        "operator": "greater_than",
        "value": 500
      },
      {
        "field": "bot.strategy",
        "operator": "in",
        "value": ["momentum", "ml_driven"]
      },
      {
        "field": "trade.confidence",
        "operator": "greater_than",
        "value": 0.8
      }
    ]
  },
  "actions": [
    {
      "type": "email",
      "template": "high_profit_trade",
      "priority": "high"
    },
    {
      "type": "webhook",
      "endpoint": "slack_trading_channel",
      "format": "slack"
    },
    {
      "type": "inapp",
      "sticky": true,
      "sound": true
    }
  ],
  "cooldown": 300 // 5 minutes between same alerts
}
```

### Advanced Conditions

```javascript
// Complex condition examples
{
  "conditions": [
    {
      "name": "Portfolio Drawdown Alert",
      "rule": {
        "operator": "AND",
        "conditions": [
          {
            "field": "portfolio.drawdown",
            "operator": "greater_than",
            "value": 0.05
          },
          {
            "field": "portfolio.drawdown_duration",
            "operator": "greater_than",
            "value": "2 hours"
          }
        ]
      }
    },
    {
      "name": "Bot Underperformance",
      "rule": {
        "operator": "OR",
        "conditions": [
          {
            "field": "bot.win_rate_24h",
            "operator": "less_than",
            "value": 0.4
          },
          {
            "field": "bot.consecutive_losses",
            "operator": "greater_than",
            "value": 5
          }
        ]
      }
    },
    {
      "name": "Market Condition Change",
      "rule": {
        "field": "market.volatility",
        "operator": "changed_by",
        "value": 0.02,
        "timeframe": "1 hour"
      }
    }
  ]
}
```

## 📱 Mobile Notifications

### Push Notifications

Mobile push notifications via Progressive Web App:

```javascript
// PWA push notification setup
{
  "pwa": {
    "pushNotifications": {
      "enabled": true,
      "vapidKeys": {
        "publicKey": "your-vapid-public-key",
        "privateKey": "your-vapid-private-key"
      },
      "payloadEncryption": true,
      "badgeSupport": true,
      "actionButtons": true
    }
  }
}
```

### SMS Notifications (via Webhook)

Send SMS through third-party services:

```javascript
// SMS webhook configuration
{
  "sms": {
    "enabled": true,
    "provider": "twilio",
    "webhook": {
      "url": "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json",
      "authentication": {
        "type": "basic",
        "username": "YOUR_ACCOUNT_SID",
        "password": "YOUR_AUTH_TOKEN"
      },
      "payload": {
        "From": "+1234567890",
        "To": "+1987654321",
        "Body": "{{message}}"
      }
    },
    "events": ["critical_alert", "bot_stopped", "high_loss"],
    "rateLimit": {
      "maxPerHour": 5,
      "emergencyOverride": true
    }
  }
}
```

---

**Next Steps:**
- Configure [Portfolio Management](portfolio.md) for advanced tracking
- Set up [Trading Interface](trading.md) for bot management
- Explore [Analytics](analytics.md) for performance insights
- Check [API Reference](../api-reference.md) for webhook integration