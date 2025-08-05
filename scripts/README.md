# A.A.I.T.I Scripts Directory

This directory contains system-specific installation and demo scripts for A.A.I.T.I, organized by operating system for better maintainability and user experience.

## Directory Structure

```
scripts/
├── common/           # Shared utilities and functions
│   └── utils.sh      # Common shell functions and utilities
├── linux/            # Linux-specific scripts
│   ├── demo-verbose.sh    # Enhanced verbose demo script for Linux
│   └── install.sh         # Installation script for Linux
├── macos/            # macOS-specific scripts
│   ├── demo-verbose.sh    # Enhanced verbose demo script for macOS
│   └── install.sh         # Installation script for macOS
└── windows/          # Windows-specific scripts
    ├── demo-verbose.bat   # Enhanced verbose demo script for Windows
    ├── install.bat        # Installation script for Windows
    └── install.ps1        # PowerShell installation script for Windows
```

## Usage

### Demo Scripts

#### Enhanced Verbose Demo (Recommended)
The verbose demo scripts provide detailed progress tracking, health checks, and troubleshooting information:

**Linux:**
```bash
./scripts/linux/demo-verbose.sh
```

**macOS:**
```bash
./scripts/macos/demo-verbose.sh
```

**Windows:**
```batch
scripts\windows\demo-verbose.bat
```

#### Quick Demo (Backward Compatible)
You can still use the original simple demo scripts in the root directory:

**Linux/macOS:**
```bash
./demo.sh
```

**Windows:**
```batch
demo.bat
```

These will automatically detect your system and offer to run the enhanced verbose version.

### Installation Scripts

**Linux:**
```bash
./scripts/linux/install.sh
```

**macOS:**
```bash
./scripts/macos/install.sh
```

**Windows (Command Prompt):**
```batch
scripts\windows\install.bat
```

**Windows (PowerShell):**
```powershell
.\scripts\windows\install.ps1
```

## Features of Enhanced Scripts

### Verbose Demo Scripts

- **🎯 Detailed Progress Tracking**: 8-step process with clear progress indicators
- **🔍 Comprehensive Health Checks**: System requirements, port availability, service health
- **⏱️ Timing Information**: Track how long each step takes
- **🌈 Color-coded Output**: Easy-to-read status messages with color coding
- **📋 Troubleshooting Info**: Built-in troubleshooting commands and tips
- **🚀 Smart Browser Launch**: Automatic browser opening with fallbacks
- **📝 Detailed Logging**: Complete logs saved to timestamped files
- **🔧 System-specific Optimizations**: Tailored for each operating system

### Enhanced Installation Scripts

- **📊 System Requirements Check**: Verify all prerequisites before installation
- **🎯 Installation Type Selection**: Production, Development, or Fast install options
- **🧹 Smart Cleanup**: Option to clean previous installations
- **⚙️ Automatic Configuration**: Generate optimized configuration files
- **📱 Platform Detection**: Detect and optimize for your specific platform
- **🍎 macOS Specific**: Apple Silicon and Intel Mac optimizations
- **🐧 Linux Specific**: Distribution-specific package management
- **🪟 Windows Specific**: PowerShell and Command Prompt compatibility

## Script Features by System

### Linux Scripts
- **Distribution Detection**: Automatically detects Ubuntu, CentOS, Fedora, etc.
- **Package Manager Support**: Works with apt, yum, dnf, and other package managers
- **Resource Monitoring**: Memory and disk space validation
- **Service Management**: Systemd integration for production deployments

### macOS Scripts
- **Architecture Detection**: Optimized for both Intel and Apple Silicon Macs
- **Homebrew Integration**: Automatic Homebrew installation and management
- **Xcode Tools Check**: Ensures Command Line Tools are installed
- **macOS Version Compatibility**: Checks and optimizes for macOS 10.15+
- **Native Notifications**: Uses macOS notification system

### Windows Scripts
- **Dual Support**: Both Command Prompt (.bat) and PowerShell (.ps1) versions
- **Docker Desktop Integration**: Specific Windows Docker Desktop checks
- **Windows Version Detection**: Supports Windows 10/11 and Windows Server
- **WSL2 Optimization**: Optimized for Windows Subsystem for Linux 2

## Common Utilities

The `scripts/common/utils.sh` file contains shared functions used across all scripts:

- **System Detection**: OS, architecture, and distribution detection
- **Docker Management**: Docker and Docker Compose utility functions
- **Network Checks**: Connectivity and port availability testing
- **Service Health**: Health check and wait functions
- **Logging**: Centralized logging and progress tracking
- **Display Functions**: Consistent color-coded output across platforms

## Backward Compatibility

The original `demo.sh` script and Windows batch files are maintained for backward compatibility. The Windows files are now organized in `scripts/windows/` but the `demo.sh` script in the root directory now:

1. **Detect the operating system**
2. **Offer choice** between simple and verbose demos
3. **Default to verbose** for the enhanced experience
4. **Fall back gracefully** if verbose scripts are not available

## Troubleshooting

### Script Permissions (Linux/macOS)
If you get permission errors, make scripts executable:
```bash
chmod +x scripts/linux/*.sh
chmod +x scripts/macos/*.sh
chmod +x scripts/common/*.sh
```

### Windows Execution Policy
If PowerShell scripts are blocked:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Docker Issues
All scripts include comprehensive Docker troubleshooting:
- Docker installation verification
- Docker service status checks
- Docker Compose command detection
- Network connectivity testing
- Port conflict resolution

## Development

### Adding New Scripts
1. Place scripts in the appropriate system directory
2. Use the common utilities from `scripts/common/utils.sh`
3. Follow the established naming convention
4. Include comprehensive error handling
5. Add system-specific optimizations

### Testing Scripts
Test scripts on their target platforms:
- **Linux**: Test on Ubuntu, CentOS, and Fedora
- **macOS**: Test on both Intel and Apple Silicon Macs
- **Windows**: Test with both Command Prompt and PowerShell

## Support

For issues with these scripts:
1. Check the generated log files (timestamped in project root)
2. Review the troubleshooting section in each script's output
3. Consult the main project documentation in `docs/`
4. Report issues on the GitHub repository

## 🆕 New Unified Entry Points

**NEW: Use these unified entry points from the project root instead of OS-specific scripts:**

```bash
./install    # Universal installer (auto-detects OS and calls appropriate implementation)
./demo       # Universal demo launcher (auto-detects OS and provides options)
```

These new scripts:
- **Auto-detect your operating system**
- **Call the appropriate OS-specific implementation** 
- **Provide consistent user experience across platforms**
- **Reduce confusion about which script to use**

### Migration Guide

| Old Approach | New Approach |
|-------------|-------------|
| `./scripts/linux/install.sh` | `./install` (auto-detects Linux) |
| `./scripts/macos/install.sh` | `./install` (auto-detects macOS) |
| `./scripts/windows/install.bat` | `./install` (works in Git Bash/WSL) |
| `./scripts/linux/demo-verbose.sh` | `./demo --verbose` |
| `./demo.sh` or `scripts/windows/demo.bat` | `./demo` (provides options) |

---

**Note**: These scripts are designed to be self-contained and provide comprehensive feedback. They automatically detect your system configuration and provide tailored installation and demo experiences. The new unified entry points make it even easier to get started!