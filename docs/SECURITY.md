# 🔐 Security & Compliance Features

This document outlines the comprehensive security and compliance features implemented in A.A.I.T.I v1.4.0.

## Table of Contents

- [Overview](#overview)
- [API Key Management](#api-key-management)
- [OAuth2/OpenID Connect](#oauth2openid-connect)
- [Enhanced Audit Logging](#enhanced-audit-logging)
- [Data Encryption](#data-encryption)
- [Compliance Features](#compliance-features)
- [Data Retention Policies](#data-retention-policies)
- [Security Events](#security-events)
- [Configuration](#configuration)
- [API Reference](#api-reference)

## Overview

The Security & Compliance module provides enterprise-grade security features including:

- **API Key Management**: Secure programmatic access with granular permissions
- **OAuth2/OpenID Connect**: Integration with external identity providers
- **Enhanced Audit Logging**: Comprehensive activity tracking for compliance
- **Data Encryption**: Protection of sensitive data at rest
- **Compliance Reporting**: Automated report generation for regulatory requirements
- **Data Retention**: Configurable policies for automated data cleanup
- **Security Event Monitoring**: Real-time security event logging and alerting

## API Key Management

### Features

- Secure API key generation with cryptographic hashing
- Granular permission system (`read`, `write`, `admin`, `trading`, `analytics`)
- Automatic expiration and cleanup
- Usage tracking and statistics
- Secure storage with salted hashes

### Usage

#### Generate API Key

```bash
curl -X POST http://localhost:5000/api/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Trading Bot Key",
    "permissions": ["read", "trading"],
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

#### List API Keys

```bash
curl -X GET http://localhost:5000/api/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Use API Key for Authentication

```bash
curl -X GET http://localhost:5000/api/trading/portfolio \
  -H "X-API-Key: YOUR_API_KEY"
```

## OAuth2/OpenID Connect

### Supported Providers

- **Google**: Full OpenID Connect support
- **GitHub**: OAuth2 with profile access
- **Extensible**: Easy to add new providers

### Configuration

Configure OAuth providers in your credentials or environment:

```json
{
  "oauth": {
    "google": {
      "clientId": "your-google-client-id",
      "clientSecret": "your-google-client-secret"
    },
    "github": {
      "clientId": "your-github-client-id", 
      "clientSecret": "your-github-client-secret"
    }
  }
}
```

### Usage Flow

1. **Get Authorization URL**
   ```bash
   curl -X GET "http://localhost:5000/api/oauth/google/authorize?redirect_uri=http://localhost:3000/auth/callback"
   ```

2. **Handle Callback**
   ```bash
   curl -X POST http://localhost:5000/api/oauth/google/callback \
     -H "Content-Type: application/json" \
     -d '{
       "code": "authorization_code_from_provider",
       "redirect_uri": "http://localhost:3000/auth/callback"
     }'
   ```

## Enhanced Audit Logging

### Features

- Comprehensive action tracking
- User attribution for all actions
- IP address and user agent logging
- Detailed request/response logging
- Regulatory compliance support

### Audit Events Tracked

- User authentication (login/logout)
- API key operations (create/update/revoke)
- Trading activities
- Administrative actions
- Data access and modifications
- Security events

### Database Schema

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Data Encryption

### Features

- AES-256-GCM encryption for sensitive data
- Secure key management
- Salt-based key derivation
- Authenticated encryption with integrity checks

### Usage

```javascript
const { encrypt, decrypt } = require('./utils/encryption');

// Encrypt sensitive data
const sensitiveData = "user-api-key-or-token";
const encrypted = encrypt(sensitiveData);

// Decrypt when needed
const decrypted = decrypt(encrypted);
```

### What's Encrypted

- API keys and tokens
- OAuth refresh tokens
- Sensitive configuration data
- User credentials (passwords use bcrypt)

## Compliance Features

### Audit Reports

Generate comprehensive audit reports for compliance:

```bash
curl -X GET "http://localhost:5000/api/compliance/audit-report?startDate=2024-01-01&endDate=2024-12-31&format=json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Trading Reports

Export trading activity for regulatory reporting:

```bash
curl -X GET "http://localhost:5000/api/compliance/trading-report?format=csv" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### User Data Export (GDPR)

Export all user data for GDPR compliance:

```bash
curl -X GET http://localhost:5000/api/compliance/export-user-data/USER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Compliance Status

Monitor overall compliance posture:

```bash
curl -X GET http://localhost:5000/api/compliance/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Data Retention Policies

### Features

- Configurable retention periods per table
- Automated cleanup scheduling
- Policy management API
- Cleanup statistics and monitoring

### Default Policies

- **Audit Logs**: 365 days
- **Security Events**: 180 days
- **Market Data**: 90 days
- **Bot Metrics**: 30 days
- **ML Predictions**: 60 days

### Managing Policies

#### Create Policy

```bash
curl -X POST http://localhost:5000/api/data-retention/policies \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "custom_table",
    "retentionDays": 90,
    "conditionColumn": "created_at"
  }'
```

#### Run Manual Cleanup

```bash
curl -X POST http://localhost:5000/api/data-retention/cleanup \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Security Events

### Event Types

- `user_login_success`
- `user_login_failed`
- `api_key_generated`
- `api_key_revoked`
- `oauth_login_attempt`
- `permission_denied`
- `data_retention_cleanup_executed`
- `user_data_exported`

### Event Severities

- **info**: Normal operations
- **warning**: Suspicious or noteworthy activities
- **critical**: Security incidents requiring attention

### Database Schema

```sql
CREATE TABLE security_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL,
  event_severity TEXT DEFAULT 'info',
  description TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  additional_data TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Configuration

### Environment Variables

```bash
# Encryption
ENCRYPTION_KEY=your-encryption-key-64-hex-chars

# OAuth (alternative to credentials.json)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Credentials File

```json
{
  "security": {
    "jwtSecret": "your-jwt-secret",
    "encryptionKey": "your-encryption-key"
  },
  "oauth": {
    "google": {
      "clientId": "your-google-client-id",
      "clientSecret": "your-google-client-secret"
    },
    "github": {
      "clientId": "your-github-client-id",
      "clientSecret": "your-github-client-secret"
    }
  }
}
```

## API Reference

### API Key Management

- `POST /api/api-keys` - Generate new API key
- `GET /api/api-keys` - List user's API keys
- `PUT /api/api-keys/:keyId` - Update API key permissions
- `DELETE /api/api-keys/:keyId` - Revoke API key
- `GET /api/api-keys/:keyId/stats` - Get API key usage statistics

### OAuth

- `GET /api/oauth/providers` - Get available OAuth providers
- `GET /api/oauth/:provider/authorize` - Get authorization URL
- `POST /api/oauth/:provider/callback` - Handle OAuth callback
- `GET /api/oauth/linked` - Get linked providers for user
- `DELETE /api/oauth/:provider/unlink` - Unlink OAuth provider

### Compliance

- `GET /api/compliance/audit-report` - Generate audit report
- `GET /api/compliance/trading-report` - Generate trading report
- `GET /api/compliance/status` - Get compliance status
- `GET /api/compliance/export-user-data/:userId` - Export user data

### Data Retention

- `GET /api/data-retention/policies` - List retention policies
- `POST /api/data-retention/policies` - Create retention policy
- `PUT /api/data-retention/policies/:policyId` - Update retention policy
- `DELETE /api/data-retention/policies/:policyId` - Delete retention policy
- `GET /api/data-retention/stats` - Get cleanup statistics
- `POST /api/data-retention/cleanup` - Run manual cleanup

## Security Best Practices

1. **API Key Security**
   - Store API keys securely (never in code)
   - Use minimal required permissions
   - Rotate keys regularly
   - Monitor key usage

2. **OAuth Configuration**
   - Use HTTPS for all OAuth flows
   - Validate state parameters
   - Store secrets securely
   - Regular token refresh

3. **Audit Compliance**
   - Regular audit log reviews
   - Automated monitoring setup
   - Compliance report generation
   - Data retention compliance

4. **Data Protection**
   - Encryption for sensitive data
   - Secure key management
   - Regular security updates
   - Access control reviews

## Troubleshooting

### Common Issues

1. **OAuth Configuration Errors**
   - Verify client IDs and secrets
   - Check redirect URI configuration
   - Ensure HTTPS in production

2. **API Key Authentication Failures**
   - Check key expiration
   - Verify permissions
   - Check key format

3. **Compliance Report Issues**
   - Verify user permissions
   - Check date range parameters
   - Monitor system resources

### Debugging

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

Check security events:

```bash
curl -X GET http://localhost:5000/api/compliance/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Support

For issues or questions regarding security features:

1. Check the troubleshooting section
2. Review audit logs for error details
3. Monitor security events
4. Contact system administrators

---

**Security Notice**: Always keep your encryption keys, OAuth secrets, and API credentials secure. Never commit them to version control or expose them in client-side code.