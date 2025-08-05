# Windows Installation Guide

Complete installation guide for A.A.I.T.I on Windows systems.

## 🖥️ System Requirements

### Supported Windows Versions
- **Windows 10**: Pro, Enterprise, or Education (Version 2004 or higher)
- **Windows 11**: All editions
- **Windows Server**: 2019 or higher

### Hardware Requirements
- **RAM**: 4GB minimum, 8GB+ recommended
- **Storage**: 5GB free space, 20GB+ recommended  
- **CPU**: 2+ cores, 4+ cores recommended
- **Virtualization**: Hyper-V capable (for Docker Desktop)

## 📦 Prerequisites

### 1. Enable Virtualization
Ensure your system supports and has enabled:
- **Hyper-V** (Windows Pro/Enterprise)
- **WSL 2** (Windows Subsystem for Linux 2)
- **Hardware virtualization** in BIOS/UEFI

### 2. Install Docker Desktop
1. Download Docker Desktop for Windows:
   ```
   https://docs.docker.com/desktop/install/windows-install/
   ```

2. Run installer as Administrator
3. During installation, ensure WSL 2 backend is selected
4. Restart your computer when prompted
5. Start Docker Desktop and complete setup

### 3. Verify Installation
Open PowerShell or Command Prompt and verify:
```powershell
docker --version
docker-compose --version
```

## 🚀 Installation Methods

### Method 1: Batch Script (Recommended)
```batch
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
scripts\windows\install.bat
```

### Method 2: PowerShell Script
```powershell
git clone https://github.com/gelimorto2/A.A.I.T.I.git
cd A.A.I.T.I
.\install.ps1
```

Additional PowerShell options:
```powershell
.\install.ps1 -Dev      # Development mode
.\install.ps1 -Minimal  # Minimal installation
.\install.ps1 -Help     # Show help
```

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