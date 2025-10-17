# A.A.I.T.I Configuration Generator

Interactive wizard to generate `.env` configuration file for A.A.I.T.I installation.

## Usage

### Automatic (via installer)
The configuration wizard runs automatically when you use `./install`:

```bash
./install
```

### Manual
Run the configuration wizard separately:

```bash
bash scripts/config-generator.sh
```

## Configuration Options

### 1. Installation Type
- **Production**: Docker-based, optimized for live trading
- **Development**: Local with hot-reload and debugging tools
- **Docker Development**: Containerized with development features

### 2. Application Settings
- HTTP port (default: 5000)
- Log level (error/warn/info/debug)
- Frontend URL

### 3. Database
- **SQLite**: File-based, simple setup (recommended for small deployments)
- **PostgreSQL**: Production-grade, scalable database

### 4. Security
Automatically generates:
- JWT secret for authentication
- Encryption key for sensitive data
- Session secret

### 5. Exchange API Keys (Optional)
Configure during installation or add later:

#### Binance
- API Key
- API Secret
- Testnet option (recommended for testing)

#### Alpaca (Stock Trading)
- API Key
- API Secret
- Paper trading option (recommended for testing)

#### Polygon.io (Market Data)
- API Key for real-time market data

### 6. Performance Settings
- Thread pool size
- Memory allocation
- Cache TTL
- Rate limiting

## Output

The wizard creates a `.env` file in the project root with all configuration:

```
A.A.I.T.I/.env
```

### File Permissions
The `.env` file is automatically set to `600` (owner read/write only) to protect sensitive data.

### Backup
If `.env` already exists, it's automatically backed up to:
```
.env.backup.YYYYMMDD_HHMMSS
```

## Configuration Examples

### Production Setup
```bash
NODE_ENV=production
PORT=5000
LOG_LEVEL=info
DB_TYPE=sqlite
BINANCE_TESTNET=false
ALPACA_PAPER=false
```

### Development Setup
```bash
NODE_ENV=development
PORT=5000
LOG_LEVEL=debug
DB_TYPE=sqlite
BINANCE_TESTNET=true
ALPACA_PAPER=true
```

### High-Performance Trading
```bash
UV_THREADPOOL_SIZE=32
NODE_OPTIONS=--max-old-space-size=4096
CACHE_TTL=600
API_RATE_LIMIT_MAX=2000
```

## Reconfiguration

To update your configuration:

```bash
# Via installer menu
./install config

# Or directly
bash scripts/config-generator.sh
```

After reconfiguration, rebuild and restart:
```bash
./install restart
```

## Manual Configuration

You can also manually edit `.env`:

```bash
nano .env
# Or any text editor
```

After manual changes, restart services:
```bash
./install restart
```

## Security Best Practices

1. **Never commit `.env` to version control**
   - Already in `.gitignore`

2. **Keep API keys secure**
   - Use testnet/paper trading for development
   - Rotate keys regularly

3. **Use strong secrets**
   - Let the wizard generate them
   - Don't reuse secrets across environments

4. **Limit file permissions**
   - Automatically set to 600
   - Only owner can read/write

5. **Different configs per environment**
   - Use separate `.env` files for dev/staging/production
   - Never share production credentials

## Troubleshooting

### Configuration wizard fails
```bash
# Ensure scripts are executable
chmod +x scripts/config-generator.sh

# Run directly with bash
bash scripts/config-generator.sh
```

### Missing openssl
The wizard needs `openssl` to generate secrets. If not available:
- **Linux**: `sudo apt-get install openssl`
- **macOS**: Should be pre-installed
- **Windows**: Use Git Bash or WSL

### .env not loading
Ensure it's in the project root:
```bash
ls -la .env
# Should show: -rw------- 1 user user ... .env
```

## Environment Variables Reference

See [INSTALL.md](../INSTALL.md#configuration-reference) for complete list of environment variables.

## Support

If you encounter issues:
1. Check [INSTALL.md](../INSTALL.md)
2. View logs: `./install logs`
3. Report issues: [GitHub Issues](https://github.com/gelimorto2/A.A.I.T.I/issues)
