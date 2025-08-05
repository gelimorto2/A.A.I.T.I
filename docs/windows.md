# 🪟 Windows Installation Guide for A.A.I.T.I

Complete setup guide for Windows 10/11 users with multiple installation methods and comprehensive troubleshooting.

## 🚀 Quick Start (Choose Your Method)

### Method 1: Windows Batch Script (Easiest) ⭐ RECOMMENDED
```batch
# Download and run the Windows installer
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
install.bat
```

### Method 2: PowerShell Script (Advanced)
```powershell
# Run PowerShell as Administrator (recommended)
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
.\install.ps1
```

### Method 3: Git Bash/WSL (Unix-like)
```bash
# Using Git Bash or WSL
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
./install
```

## 📋 Windows System Requirements

### Minimum Requirements
- **OS**: Windows 10 64-bit (version 1903+) or Windows 11
- **RAM**: 4GB (8GB recommended)
- **Storage**: 5GB free disk space (20GB for full development setup)
- **Network**: Internet connection for initial setup

### Required Software (Auto-detected by installer)

#### For Docker Installation (Recommended) 🐳
- **Docker Desktop for Windows**
  - Download: https://docs.docker.com/desktop/install/windows-install/
  - Requires WSL 2 backend (Windows 10/11 Pro/Enterprise/Education)
  - Or Hyper-V backend (Windows 10 Pro/Enterprise)

#### For NPM Installation (Advanced) 📦
- **Node.js 18+**
  - Download: https://nodejs.org/
  - LTS version recommended
- **npm** (included with Node.js)
- **Git for Windows** (for cloning repository)

## 🛠️ Installation Methods

### 🐳 Docker Installation (Recommended)

**Why Docker?**
- ✅ Isolated environment
- ✅ No Node.js version conflicts  
- ✅ Production-ready setup
- ✅ Easy to remove/upgrade
- ✅ Works consistently across different Windows versions

**Step 1: Install Docker Desktop**
1. Download Docker Desktop from https://docker.com
2. Run installer as Administrator
3. Enable WSL 2 integration when prompted
4. Restart computer if required
5. Start Docker Desktop and wait for it to be ready

**Step 2: Install A.A.I.T.I**
```batch
# Open Command Prompt or PowerShell
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
install.bat
# Select option 1 (Docker Installation)
```

**Docker Installation Options:**
1. **Production** - Optimized for live trading
2. **Development** - With hot reload for development  
3. **Production + Monitoring** - Includes Prometheus/Grafana
4. **Full Stack** - All services (nginx, redis, monitoring)

### 📦 NPM Installation (Advanced Users)

**When to use NPM installation:**
- You need direct access to source code
- You're developing/customizing A.A.I.T.I
- You prefer native Windows installation
- Docker Desktop is not available

**Step 1: Install Node.js**
1. Download from https://nodejs.org/ (LTS version)
2. Run installer with default settings
3. Verify installation:
   ```cmd
   node --version
   npm --version
   ```

**Step 2: Install A.A.I.T.I**
```batch
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
install.bat
# Select option 2 (NPM Installation)
```

**NPM Installation Options:**
1. **Production** - Optimized build for live trading
2. **Development** - Full development environment
3. **Fast Install** - Quick setup with minimal features

### Method 3: Manual Installation
```batch
# Clone repository
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I

# Install dependencies
npm run install:all

# Build and start services
docker-compose up -d --build
```

## 🎮 Demo Mode

For quick evaluation without full setup:
```batch
# Quick demo
scripts\windows\demo.bat

# Or download and run
curl -o scripts\windows\demo.bat https://raw.githubusercontent.com/gelimorto2/A.A.I.T.I/main/scripts/windows/demo.bat
scripts\windows\demo.bat
```

## 🔧 Windows-Specific Configuration

### Environment Variables
Set these in System Properties → Environment Variables:
```
AAITI_DATA_PATH=C:\ProgramData\AAITI
AAITI_LOG_PATH=C:\Logs\AAITI
```

### Firewall Configuration
Allow these ports through Windows Firewall:
- **Port 5000**: Backend API
- **Port 3000**: Frontend (development)
- **Port 80/443**: Web access (production)

### Performance Optimization

#### 1. Docker Settings
In Docker Desktop settings:
- **Memory**: 4-8GB
- **CPUs**: 2-4 cores  
- **Disk image location**: SSD preferred

#### 2. WSL 2 Optimization
Create/edit `%USERPROFILE%\.wslconfig`:
```ini
[wsl2]
memory=4GB
processors=2
swap=1GB
```

## 🛠️ Development Setup

### Windows Development Tools
Install these for development:
- **Git for Windows**: https://git-scm.com/download/win
- **Node.js**: https://nodejs.org/en/download/
- **Visual Studio Code**: https://code.visualstudio.com/
- **Windows Terminal**: https://apps.microsoft.com/store/detail/windows-terminal/

### VS Code Extensions
Recommended extensions:
- Docker
- Remote-WSL
- JavaScript/TypeScript
- GitLens

## 🚨 Common Issues

### Docker Desktop Issues
**Problem**: "Docker Desktop starting..." never completes
**Solution**: 
1. Restart Docker Desktop as Administrator
2. Reset Docker to factory defaults
3. Check Windows features: Enable Hyper-V and WSL

**Problem**: "WSL 2 installation incomplete"
**Solution**:
```powershell
# Enable WSL
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Enable Virtual Machine Platform
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Restart and install WSL 2 kernel update
wsl --install
```

### Permission Issues
**Problem**: Access denied errors
**Solution**: Run Command Prompt or PowerShell as Administrator

### Port Conflicts
**Problem**: Port 5000 already in use
**Solution**: Stop conflicting services:
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

## 📊 Monitoring and Logs

### Windows Event Logs
Monitor A.A.I.T.I logs in:
- Event Viewer → Applications and Services Logs
- Docker Desktop logs in `%APPDATA%\Docker\log.txt`

### Performance Monitoring
- **Task Manager**: Monitor Docker resource usage
- **Resource Monitor**: Detailed system performance
- **Docker Desktop**: Container resource usage

## 🔄 Maintenance

### Updates
```batch
# Stop services
docker-compose down

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

### Cleanup
```batch
# Remove unused containers and images
docker system prune -a

# Clean npm cache
npm cache clean --force
```

## 🆘 Getting Help

### Windows-Specific Support
- [Docker Desktop for Windows Issues](https://github.com/docker/for-win/issues)
- [WSL 2 Documentation](https://docs.microsoft.com/en-us/windows/wsl/)
- [A.A.I.T.I Troubleshooting](troubleshooting.md)

### System Information
Gather this info when reporting issues:
```powershell
# System info
systeminfo | findstr /B /C:"OS Name" /C:"OS Version"

# Docker info  
docker version
docker info

# A.A.I.T.I status
curl http://localhost:5000/api/health
```

---

**Note**: This guide is specifically for Windows installations. For Linux/macOS, see the [general installation guide](installation.md).