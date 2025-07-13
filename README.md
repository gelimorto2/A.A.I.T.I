# A.A.I.T.I - Auto AI Trading Interface

🧠 **AAITI** isn't a dashboard. It's a mission-critical environment for deploying, supervising, and evolving AI-powered trading agents in live markets.

## 🚀 Features

- **Multi-Bot Management**: Run multiple AI trading bots in parallel with isolated execution environments
- **Real-Time Monitoring**: Live bot health scores, P&L tracking, and performance analytics
- **Trading Modes**: Support for live, paper, and shadow trading modes
- **Mission-Critical Interface**: Dark theme, tactical design focused on clarity and speed
- **Real-Time Data**: WebSocket-powered live updates for all critical metrics
- **Secure Authentication**: JWT-based auth with role-based access control
- **Audit Trail**: Complete logging of all user actions and bot operations

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database for development (easily upgradeable)
- **Socket.IO** for real-time communication
- **JWT** authentication
- **Winston** logging

### Frontend
- **React** with TypeScript
- **Material-UI** with custom dark theme
- **Redux Toolkit** for state management
- **Socket.IO Client** for real-time updates
- **Chart.js** for advanced visualizations

## 📦 Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd A.A.I.T.I
```

2. **Install all dependencies**
```bash
npm run install:all
```

3. **Start development servers**
```bash
npm run dev
```

This will start:
- Backend API server on `http://localhost:5000`
- Frontend React app on `http://localhost:3000`

### Manual Setup

**Backend Setup:**
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm start
```

## 🏗 Project Structure

```
A.A.I.T.I/
├── backend/                 # Node.js API server
│   ├── routes/             # API endpoints
│   ├── database/           # SQLite database and schemas
│   ├── middleware/         # Authentication & logging
│   ├── utils/              # Utilities and helpers
│   └── server.js           # Main server file
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store and slices
│   │   ├── services/       # API service layer
│   │   ├── contexts/       # React contexts
│   │   └── types/          # TypeScript type definitions
│   └── public/             # Static assets
└── package.json            # Root package configuration
```

## 🔐 Authentication

Default setup creates users with these roles:
- **Admin**: Full system access
- **Trader**: Full trading access
- **Viewer**: Read-only access

Create your first user by registering at `/register` or using the API directly.

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### Bots
- `GET /api/bots` - List user's bots
- `POST /api/bots` - Create new bot
- `PUT /api/bots/:id` - Update bot
- `DELETE /api/bots/:id` - Delete bot
- `POST /api/bots/:id/start` - Start bot
- `POST /api/bots/:id/stop` - Stop bot

### Trading
- `GET /api/trading/signals/:botId` - Get trading signals
- `GET /api/trading/trades/:botId` - Get trades
- `POST /api/trading/execute` - Execute manual trade
- `GET /api/trading/market-data/:symbol` - Get market data

### Analytics
- `GET /api/analytics/portfolio` - Portfolio overview
- `GET /api/analytics/performance/:botId` - Bot performance
- `GET /api/analytics/risk` - Risk analysis

## 🔄 Real-Time Features

The system uses WebSocket connections to provide real-time updates for:
- Bot status changes
- New trading signals
- Trade executions
- Performance metrics
- Price updates

## 🎨 UI/UX Design

AAITI features a mission-critical dark interface designed for clarity and speed:
- **Color Scheme**: Green (#00ff88) for positive/active states, Red (#ff3366) for alerts/negative states
- **Typography**: JetBrains Mono for professional monospace appearance
- **Layout**: Tactical sidebar navigation with real-time status indicators
- **Components**: Minimal, focused design that prioritizes information density

## 🚦 Development

### Available Scripts

**Root Level:**
- `npm run dev` - Start both backend and frontend
- `npm run install:all` - Install all dependencies
- `npm run build` - Build frontend for production

**Backend:**
- `npm run dev` - Start backend with nodemon
- `npm start` - Start backend in production mode

**Frontend:**
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

### Environment Variables

Backend (`.env`):
```
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
DB_PATH=./database/aaiti.sqlite
```

## 🔮 Roadmap

- [ ] Advanced charting and technical indicators
- [ ] Strategy backtesting interface
- [ ] Machine learning model integration
- [ ] Advanced risk management tools
- [ ] Multi-exchange connectivity
- [ ] Portfolio optimization algorithms
- [ ] Alert system with notifications
- [ ] API webhooks for external integrations

## ⚠️ Disclaimer

This is a development/demonstration version. For live trading:
- Implement proper security hardening
- Use production-grade databases
- Add comprehensive error handling
- Implement proper backup strategies
- Add monitoring and alerting

## 📝 License

ISC License - see LICENSE file for details.

---

**AAITI**: Neural Command Deck for AI-Powered Trading • Mission-Critical • Real-Time • Autonomous
