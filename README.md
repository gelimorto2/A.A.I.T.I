# A.A.I.T.I - Auto AI Trading Interface

🧠 **AAITI** isn't a dashboard. It's a mission-critical environment for deploying, supervising, and evolving AI-powered trading agents in live markets.

## 🚀 Features

- **Multi-Bot Management**: Run multiple AI trading bots in parallel with isolated execution environments
- **Real-Time Monitoring**: Live bot health scores, P&L tracking, and performance analytics
- **Trading Modes**: Support for live, paper, and shadow trading modes
- **Mission-Critical Interface**: Dark theme, tactical design focused on clarity and speed
- **Real-Time Data**: WebSocket-powered live updates for all critical metrics
- **Secure Authentication**: JWT-based auth with role-based access control
- **Comprehensive Settings Management**: UI-based configuration system with no external file dependencies
- **Audit Trail**: Complete logging of all user actions and bot operations

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database for development (easily upgradeable)
- **Socket.IO** for real-time communication
- **JWT** authentication
- **Winston** logging
- **Integrated Settings System** with database persistence

### Frontend
- **React** with TypeScript
- **Material-UI** with custom dark theme
- **Redux Toolkit** for state management
- **Socket.IO Client** for real-time updates
- **Chart.js** for advanced visualizations
- **Comprehensive Settings UI** for system configuration

## 📦 Installation & Setup

### Prerequisites
- **Node.js 16+** (recommended: v18 or higher)
- **npm** (comes with Node.js)
- **Git** for cloning the repository

### Quick Start (Recommended)

1. **Clone the repository**
```bash
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
```

2. **Install all dependencies**
```bash
npm run install:all
```
*This command installs dependencies for both frontend and backend.*

3. **Start development servers**
```bash
npm run dev
```

**✅ Success indicators:**
- Backend API server running on `http://localhost:5000`
- Frontend React app available at `http://localhost:3000`
- Backend shows "AAITI Backend Server running on port 5000"
- Frontend shows "Compiled successfully!" with no ESLint errors
- Settings are automatically initialized and managed through the UI

### Manual Setup (Alternative)

If you prefer to start services individually:

**Backend Setup:**
```bash
cd backend
npm install
npm run dev
```

**Frontend Setup (in separate terminal):**
```bash
cd frontend
npm install
npm start
```

### Production Build

To create a production-ready build:

```bash
# Build frontend for production
npm run build

# Start backend in production mode
npm run start:backend
```

The built frontend will be in `frontend/build/` directory.

## 🏗 Project Structure

```
A.A.I.T.I/
├── backend/                 # Node.js API server
│   ├── routes/             # API endpoints
│   ├── database/           # SQLite database and schemas
│   ├── middleware/         # Authentication & logging
│   ├── utils/              # Utilities and helpers
│   ├── config/             # Settings management system
│   └── server.js           # Main server file
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store and slices
│   │   ├── services/       # API service layer
│   │   ├── contexts/       # React contexts
│   │   ├── settings/       # Settings management UI
│   │   └── types/          # TypeScript type definitions
│   └── public/             # Static assets
└── package.json            # Root package configuration
```

## ⚙️ Settings Management

**New UI-Based Configuration System:**
- **No .env file required** - All settings managed through the application UI
- **Database-persisted settings** - Configurations saved to SQLite database
- **Real-time updates** - Settings changes applied immediately
- **User-friendly interface** - Comprehensive settings panel in the application
- **Default configurations** - Sensible defaults for immediate use

Access settings through the application's Settings panel after logging in.

## 🔐 Authentication

Default setup creates users with these roles:
- **Admin**: Full system access including settings management
- **Trader**: Full trading access
- **Viewer**: Read-only access

Create your first user by registering at `/register` or using the API directly.

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/reset` - Reset to defaults

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
- Settings changes

## 🎨 UI/UX Design

AAITI features a mission-critical dark interface designed for clarity and speed:
- **Color Scheme**: Green (#00ff88) for positive/active states, Red (#ff3366) for alerts/negative states
- **Typography**: JetBrains Mono for professional monospace appearance
- **Layout**: Tactical sidebar navigation with real-time status indicators
- **Components**: Minimal, focused design that prioritizes information density
- **Settings Panel**: Intuitive configuration interface with real-time validation

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

### Configuration

**No Environment Files Required:**
All configuration is managed through the application's Settings UI. The system automatically:
- Initializes with sensible defaults
- Persists settings to the database
- Provides real-time configuration updates
- Includes validation and error handling

## 🔮 Roadmap

### ✅ Recently Completed Features
- [x] **Comprehensive Settings Management System** - UI-based configuration with database persistence
- [x] **Removal of .env Dependencies** - Streamlined setup process
- [x] **Enhanced User Experience** - Improved onboarding and configuration flow
- [x] Multi-Bot Management interface
- [x] Real-Time Monitoring dashboard
- [x] Trading Modes support (live, paper, shadow)
- [x] Mission-Critical dark theme interface
- [x] Real-Time WebSocket communication
- [x] Secure JWT authentication
- [x] Complete audit trail and logging
- [x] SQLite database integration
- [x] RESTful API endpoints
- [x] React TypeScript frontend
- [x] Production build process

### 🚀 Future Enhancements
- [ ] Advanced charting and technical indicators
- [ ] Strategy backtesting interface
- [ ] Machine learning model integration
- [ ] Advanced risk management tools
- [ ] Multi-exchange connectivity
- [ ] Portfolio optimization algorithms
- [ ] Alert system with notifications
- [ ] API webhooks for external integrations
- [ ] Mobile-responsive design improvements
- [ ] Advanced user role management

## 🛠 Troubleshooting

### Common Issues & Solutions

#### Frontend Not Starting
**Problem:** React development server fails to start
**Solutions:**
- Ensure Node.js 16+ is installed: `node --version`
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check if port 3000 is already in use: `lsof -ti:3000` (kill with `kill -9 <PID>`)

#### Backend Connection Issues
**Problem:** Backend fails to start or crashes
**Solutions:**
- Verify port 5000 is available: `lsof -ti:5000`
- Ensure all backend dependencies are installed: `cd backend && npm install`
- Check database permissions: `ls -la backend/database/`
- Settings are now managed internally - no .env file required

#### Port Already in Use
**Problem:** `Error: listen EADDRINUSE: address already in use`
**Solutions:**
```bash
# Kill processes on ports 3000 and 5000
sudo lsof -ti:3000 | xargs sudo kill -9
sudo lsof -ti:5000 | xargs sudo kill -9
```

#### Build Failures
**Problem:** Production build fails
**Solutions:**
- Check Node.js version (minimum 16+)
- Update dependencies: `npm run install:all`
- Clear build cache: `cd frontend && rm -rf build && npm run build`

#### Settings Configuration
**Problem:** Unable to configure application settings
**Solutions:**
- Access settings through the UI after logging in
- Check user permissions (Admin role required for settings changes)
- Verify database connectivity
- Settings are automatically initialized on first run

#### Database Issues
**Problem:** SQLite database errors
**Solutions:**
- Check database file: `ls -la backend/database/aaiti.sqlite`
- Delete and restart (development only): `rm backend/database/aaiti.sqlite`
- Ensure proper permissions: `chmod 664 backend/database/aaiti.sqlite`

### Performance Tips

- **Development:** Use `npm run dev` for development with hot reload
- **Production:** Use `npm run build` then serve the built files with a static server
- **Memory:** If build fails with memory issues, increase Node.js heap: `export NODE_OPTIONS="--max-old-space-size=4096"`

### Getting Help

1. Check the browser console for frontend errors (F12 → Console)
2. Check backend logs in terminal for API errors
3. Verify settings through the application's Settings UI
4. Ensure all dependencies are installed with correct versions

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

## 🎯 Project Status

✅ **FULLY FUNCTIONAL** - All systems operational as of latest update

### Verified Working Components:
- ✅ Frontend React application starts successfully
- ✅ Backend Node.js API server operational
- ✅ Database initialization and connection
- ✅ User authentication system
- ✅ Real-time WebSocket communication
- ✅ Dark theme UI with mission-critical design
- ✅ **Comprehensive Settings Management System**
- ✅ **UI-based configuration (no .env files required)**
- ✅ Production build process
- ✅ Mock trading data integration
- ✅ All API endpoints responding correctly

### Latest Updates Verified:
- Settings management system fully operational
- No external configuration files required
- Enhanced user experience with streamlined setup
- Database-persisted configuration system
- Real-time settings validation and updates
- Improved onboarding process

**Ready for development and demonstration use with enhanced configuration management!**
