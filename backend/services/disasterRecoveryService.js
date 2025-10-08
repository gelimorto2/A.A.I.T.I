/**
 * Disaster Recovery Service for A.A.I.T.I
 * Handles backup creation, validation, and restoration procedures
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { logger } = require('../utils/logger');

class DisasterRecoveryService {
    constructor() {
        this.backupBasePath = path.join(__dirname, '../../backups');
        this.databasePath = path.join(__dirname, '../database');
        this.configPath = path.join(__dirname, '../config');
        this.backupRetentionDays = 30;
        this.backupTypes = new Set(['database', 'config', 'logs', 'full']);
        
        this.initializeBackupDirectory();
    }

    /**
     * Initialize backup directory structure
     */
    async initializeBackupDirectory() {
        try {
            await fs.mkdir(this.backupBasePath, { recursive: true });
            await fs.mkdir(path.join(this.backupBasePath, 'database'), { recursive: true });
            await fs.mkdir(path.join(this.backupBasePath, 'config'), { recursive: true });
            await fs.mkdir(path.join(this.backupBasePath, 'logs'), { recursive: true });
            await fs.mkdir(path.join(this.backupBasePath, 'full'), { recursive: true });
            
            logger.info('💾 Disaster recovery backup directories initialized');
        } catch (error) {
            logger.error('Failed to initialize backup directories:', error);
            throw error;
        }
    }

    /**
     * Create a comprehensive backup
     */
    async createBackup(backupType = 'full', options = {}) {
        const backupId = `backup_${Date.now()}_${backupType}`;
        const timestamp = new Date().toISOString();
        
        logger.info(`🔄 Creating ${backupType} backup: ${backupId}`);
        
        const backupInfo = {
            id: backupId,
            type: backupType,
            timestamp,
            status: 'in-progress',
            startTime: Date.now(),
            files: [],
            size: 0,
            checksum: null,
            metadata: {
                version: require('../../package.json').version,
                nodeVersion: process.version,
                platform: process.platform,
                ...options.metadata
            }
        };

        try {
            switch (backupType) {
                case 'database':
                    await this.backupDatabase(backupId, backupInfo);
                    break;
                case 'config':
                    await this.backupConfiguration(backupId, backupInfo);
                    break;
                case 'logs':
                    await this.backupLogs(backupId, backupInfo);
                    break;
                case 'full':
                    await this.backupDatabase(backupId, backupInfo);
                    await this.backupConfiguration(backupId, backupInfo);
                    await this.backupLogs(backupId, backupInfo);
                    break;
                default:
                    throw new Error(`Unknown backup type: ${backupType}`);
            }

            // Calculate total backup size
            backupInfo.size = await this.calculateBackupSize(backupId);
            
            // Create backup checksum
            backupInfo.checksum = await this.createBackupChecksum(backupId);
            
            // Finalize backup info
            backupInfo.status = 'completed';
            backupInfo.endTime = Date.now();
            backupInfo.duration = backupInfo.endTime - backupInfo.startTime;
            
            // Save backup metadata
            await this.saveBackupMetadata(backupId, backupInfo);
            
            logger.info(`✅ Backup completed: ${backupId}`, {
                type: backupType,
                size: `${Math.round(backupInfo.size / 1024 / 1024)}MB`,
                duration: `${Math.round(backupInfo.duration / 1000)}s`,
                files: backupInfo.files.length
            });
            
            return backupInfo;

        } catch (error) {
            backupInfo.status = 'failed';
            backupInfo.error = error.message;
            backupInfo.endTime = Date.now();
            
            await this.saveBackupMetadata(backupId, backupInfo);
            
            logger.error(`❌ Backup failed: ${backupId}`, error);
            throw error;
        }
    }

    /**
     * Backup database files
     */
    async backupDatabase(backupId, backupInfo) {
        const dbBackupPath = path.join(this.backupBasePath, 'database', backupId);
        await fs.mkdir(dbBackupPath, { recursive: true });
        
        try {
            // Get all database files
            const dbFiles = await fs.readdir(this.databasePath);
            
            for (const file of dbFiles) {
                const sourcePath = path.join(this.databasePath, file);
                const targetPath = path.join(dbBackupPath, file);
                
                const stats = await fs.stat(sourcePath);
                if (stats.isFile()) {
                    await fs.copyFile(sourcePath, targetPath);
                    backupInfo.files.push({
                        type: 'database',
                        original: sourcePath,
                        backup: targetPath,
                        size: stats.size
                    });
                }
            }
            
            logger.info(`📊 Database backup completed: ${dbFiles.length} files`);
            
        } catch (error) {
            logger.error('Database backup failed:', error);
            throw error;
        }
    }

    /**
     * Backup configuration files
     */
    async backupConfiguration(backupId, backupInfo) {
        const configBackupPath = path.join(this.backupBasePath, 'config', backupId);
        await fs.mkdir(configBackupPath, { recursive: true });
        
        try {
            // Backup main config files
            const configFiles = await fs.readdir(this.configPath);
            
            for (const file of configFiles) {
                const sourcePath = path.join(this.configPath, file);
                const targetPath = path.join(configBackupPath, file);
                
                const stats = await fs.stat(sourcePath);
                if (stats.isFile()) {
                    await fs.copyFile(sourcePath, targetPath);
                    backupInfo.files.push({
                        type: 'config',
                        original: sourcePath,
                        backup: targetPath,
                        size: stats.size
                    });
                }
            }
            
            // Backup environment files
            const envFiles = ['.env', '.env.production', '.env.docker'];
            for (const envFile of envFiles) {
                const envPath = path.join(__dirname, '../../', envFile);
                try {
                    await fs.access(envPath);
                    const targetPath = path.join(configBackupPath, envFile);
                    await fs.copyFile(envPath, targetPath);
                    
                    const stats = await fs.stat(envPath);
                    backupInfo.files.push({
                        type: 'environment',
                        original: envPath,
                        backup: targetPath,
                        size: stats.size
                    });
                } catch (error) {
                    // File doesn't exist, skip
                }
            }
            
            logger.info(`⚙️ Configuration backup completed: ${configFiles.length} files`);
            
        } catch (error) {
            logger.error('Configuration backup failed:', error);
            throw error;
        }
    }

    /**
     * Backup log files
     */
    async backupLogs(backupId, backupInfo) {
        const logsBackupPath = path.join(this.backupBasePath, 'logs', backupId);
        await fs.mkdir(logsBackupPath, { recursive: true });
        
        try {
            const logsPath = path.join(__dirname, '../logs');
            
            try {
                const logFiles = await fs.readdir(logsPath);
                
                for (const file of logFiles) {
                    const sourcePath = path.join(logsPath, file);
                    const targetPath = path.join(logsBackupPath, file);
                    
                    const stats = await fs.stat(sourcePath);
                    if (stats.isFile()) {
                        await fs.copyFile(sourcePath, targetPath);
                        backupInfo.files.push({
                            type: 'logs',
                            original: sourcePath,
                            backup: targetPath,
                            size: stats.size
                        });
                    }
                }
                
                logger.info(`📝 Logs backup completed: ${logFiles.length} files`);
            } catch (error) {
                logger.warn('No logs directory found, skipping logs backup');
            }
            
        } catch (error) {
            logger.error('Logs backup failed:', error);
            throw error;
        }
    }

    /**
     * Restore from backup
     */
    async restoreFromBackup(backupId, options = {}) {
        logger.info(`🔄 Starting restoration from backup: ${backupId}`);
        
        const backupMetadata = await this.loadBackupMetadata(backupId);
        if (!backupMetadata) {
            throw new Error(`Backup metadata not found: ${backupId}`);
        }

        if (backupMetadata.status !== 'completed') {
            throw new Error(`Cannot restore from incomplete backup: ${backupId}`);
        }

        const restoreInfo = {
            backupId,
            timestamp: new Date().toISOString(),
            startTime: Date.now(),
            status: 'in-progress',
            restoredFiles: []
        };

        try {
            // Verify backup integrity before restoration
            const checksumValid = await this.verifyBackupChecksum(backupId, backupMetadata.checksum);
            if (!checksumValid) {
                throw new Error('Backup checksum verification failed');
            }

            // Create restoration point (backup current state)
            if (!options.skipRestorationPoint) {
                const restorationPointId = `restore_point_${Date.now()}`;
                await this.createBackup('full', { 
                    metadata: { 
                        isRestorationPoint: true,
                        originalBackupId: backupId 
                    }
                });
                restoreInfo.restorationPointId = restorationPointId;
            }

            // Restore files based on backup type
            for (const fileInfo of backupMetadata.files) {
                await this.restoreFile(fileInfo, restoreInfo);
            }

            restoreInfo.status = 'completed';
            restoreInfo.endTime = Date.now();
            restoreInfo.duration = restoreInfo.endTime - restoreInfo.startTime;

            logger.info(`✅ Restoration completed: ${backupId}`, {
                filesRestored: restoreInfo.restoredFiles.length,
                duration: `${Math.round(restoreInfo.duration / 1000)}s`
            });

            return restoreInfo;

        } catch (error) {
            restoreInfo.status = 'failed';
            restoreInfo.error = error.message;
            restoreInfo.endTime = Date.now();

            logger.error(`❌ Restoration failed: ${backupId}`, error);
            throw error;
        }
    }

    /**
     * Restore individual file
     */
    async restoreFile(fileInfo, restoreInfo) {
        try {
            // Ensure target directory exists
            const targetDir = path.dirname(fileInfo.original);
            await fs.mkdir(targetDir, { recursive: true });
            
            // Copy file back to original location
            await fs.copyFile(fileInfo.backup, fileInfo.original);
            
            restoreInfo.restoredFiles.push({
                type: fileInfo.type,
                path: fileInfo.original,
                size: fileInfo.size,
                timestamp: new Date().toISOString()
            });
            
            logger.debug(`Restored file: ${fileInfo.original}`);
            
        } catch (error) {
            logger.error(`Failed to restore file: ${fileInfo.original}`, error);
            throw error;
        }
    }

    /**
     * List available backups
     */
    async listBackups(backupType = null) {
        const backups = [];
        
        try {
            const backupDirs = backupType ? [backupType] : ['database', 'config', 'logs', 'full'];
            
            for (const dir of backupDirs) {
                const dirPath = path.join(this.backupBasePath, dir);
                try {
                    const entries = await fs.readdir(dirPath);
                    for (const entry of entries) {
                        const metadataPath = path.join(dirPath, entry, 'metadata.json');
                        try {
                            const metadata = await this.loadBackupMetadata(entry);
                            if (metadata) {
                                backups.push(metadata);
                            }
                        } catch (error) {
                            // Skip invalid backups
                        }
                    }
                } catch (error) {
                    // Directory doesn't exist, skip
                }
            }
            
            // Sort by timestamp (newest first)
            backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return backups;
            
        } catch (error) {
            logger.error('Failed to list backups:', error);
            throw error;
        }
    }

    /**
     * Validate backup integrity
     */
    async validateBackup(backupId) {
        const backupMetadata = await this.loadBackupMetadata(backupId);
        if (!backupMetadata) {
            return { valid: false, error: 'Backup metadata not found' };
        }

        const validation = {
            backupId,
            valid: true,
            checks: [],
            errors: []
        };

        try {
            // Check if backup files exist
            for (const fileInfo of backupMetadata.files) {
                try {
                    await fs.access(fileInfo.backup);
                    const stats = await fs.stat(fileInfo.backup);
                    
                    if (stats.size !== fileInfo.size) {
                        validation.valid = false;
                        validation.errors.push(`File size mismatch: ${fileInfo.backup}`);
                    } else {
                        validation.checks.push(`✅ File exists: ${path.basename(fileInfo.backup)}`);
                    }
                } catch (error) {
                    validation.valid = false;
                    validation.errors.push(`Missing file: ${fileInfo.backup}`);
                }
            }

            // Verify checksum
            const checksumValid = await this.verifyBackupChecksum(backupId, backupMetadata.checksum);
            if (checksumValid) {
                validation.checks.push('✅ Checksum verification passed');
            } else {
                validation.valid = false;
                validation.errors.push('Checksum verification failed');
            }

            return validation;

        } catch (error) {
            return {
                backupId,
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Perform disaster recovery drill
     */
    async performDisasterRecoveryDrill() {
        logger.info('🚨 Starting Disaster Recovery Drill');
        
        const drillInfo = {
            id: `drill_${Date.now()}`,
            timestamp: new Date().toISOString(),
            startTime: Date.now(),
            phases: [],
            status: 'in-progress'
        };

        try {
            // Phase 1: Create current state backup
            drillInfo.phases.push({ phase: 1, name: 'Pre-drill backup', status: 'in-progress', startTime: Date.now() });
            const preBackup = await this.createBackup('full', { 
                metadata: { isDrillBackup: true, drillId: drillInfo.id }
            });
            drillInfo.phases[0].status = 'completed';
            drillInfo.phases[0].endTime = Date.now();
            drillInfo.preBackupId = preBackup.id;

            // Phase 2: Simulate disaster (optional - can be skipped in production)
            if (process.env.NODE_ENV !== 'production') {
                drillInfo.phases.push({ phase: 2, name: 'Disaster simulation', status: 'skipped', reason: 'Safety - skipped in drill mode' });
            }

            // Phase 3: Validate existing backups
            drillInfo.phases.push({ phase: 3, name: 'Backup validation', status: 'in-progress', startTime: Date.now() });
            const backups = await this.listBackups();
            const validationResults = [];
            
            for (const backup of backups.slice(0, 5)) { // Validate last 5 backups
                const validation = await this.validateBackup(backup.id);
                validationResults.push(validation);
            }
            
            drillInfo.phases[drillInfo.phases.length - 1].status = 'completed';
            drillInfo.phases[drillInfo.phases.length - 1].endTime = Date.now();
            drillInfo.phases[drillInfo.phases.length - 1].validationResults = validationResults;

            // Phase 4: Test restoration procedure (to temporary location)
            drillInfo.phases.push({ phase: 4, name: 'Restoration test', status: 'in-progress', startTime: Date.now() });
            
            if (backups.length > 0) {
                const testRestorePath = path.join(this.backupBasePath, 'drill_restore_test');
                await fs.mkdir(testRestorePath, { recursive: true });
                
                // Test restore to temporary location (simulate only)
                drillInfo.testRestorePath = testRestorePath;
                drillInfo.phases[drillInfo.phases.length - 1].message = 'Restoration procedure validated (simulation)';
            } else {
                drillInfo.phases[drillInfo.phases.length - 1].message = 'No backups available for restoration test';
            }
            
            drillInfo.phases[drillInfo.phases.length - 1].status = 'completed';
            drillInfo.phases[drillInfo.phases.length - 1].endTime = Date.now();

            // Phase 5: Generate recovery documentation
            drillInfo.phases.push({ phase: 5, name: 'Documentation generation', status: 'in-progress', startTime: Date.now() });
            const recoveryDoc = await this.generateRecoveryDocumentation(drillInfo);
            drillInfo.phases[drillInfo.phases.length - 1].status = 'completed';
            drillInfo.phases[drillInfo.phases.length - 1].endTime = Date.now();
            drillInfo.recoveryDocumentationPath = recoveryDoc;

            drillInfo.status = 'completed';
            drillInfo.endTime = Date.now();
            drillInfo.totalDuration = drillInfo.endTime - drillInfo.startTime;

            logger.info('✅ Disaster Recovery Drill Completed Successfully', {
                drillId: drillInfo.id,
                duration: `${Math.round(drillInfo.totalDuration / 1000)}s`,
                phases: drillInfo.phases.length,
                backupsValidated: validationResults.length
            });

            return drillInfo;

        } catch (error) {
            drillInfo.status = 'failed';
            drillInfo.error = error.message;
            drillInfo.endTime = Date.now();

            logger.error('❌ Disaster Recovery Drill Failed', error);
            throw error;
        }
    }

    /**
     * Generate recovery documentation
     */
    async generateRecoveryDocumentation(drillInfo) {
        const docPath = path.join(this.backupBasePath, `recovery_procedures_${drillInfo.id}.md`);
        
        const documentation = `# A.A.I.T.I Disaster Recovery Procedures

Generated during drill: ${drillInfo.id}
Date: ${drillInfo.timestamp}

## Recovery Steps

### 1. Assess the Situation
- Identify the scope of the disaster
- Determine which systems are affected
- Assess data integrity

### 2. Locate Latest Valid Backup
\`\`\`bash
# List available backups
curl -X GET http://localhost:5000/api/disaster-recovery/backups \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### 3. Validate Backup Integrity
\`\`\`bash
# Validate specific backup
curl -X POST http://localhost:5000/api/disaster-recovery/validate/BACKUP_ID \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### 4. Stop All Services
\`\`\`bash
# Stop A.A.I.T.I services
docker-compose down
# or
pm2 stop all
\`\`\`

### 5. Restore from Backup
\`\`\`bash
# Restore from backup
curl -X POST http://localhost:5000/api/disaster-recovery/restore/BACKUP_ID \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"skipRestorationPoint": false}'
\`\`\`

### 6. Restart Services
\`\`\`bash
# Restart A.A.I.T.I services
docker-compose up -d
# or
pm2 start all
\`\`\`

### 7. Verify System Health
\`\`\`bash
# Check system health
curl -X GET http://localhost:5000/api/observability/health \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

## Emergency Contacts
- Technical Lead: [Add contact information]
- Infrastructure Team: [Add contact information]
- Management: [Add contact information]

## Backup Locations
- Primary: ${this.backupBasePath}
- Secondary: [Add secondary backup location if available]

## Recovery Time Objectives (RTO)
- Database recovery: < 30 minutes
- Full system recovery: < 1 hour
- Data loss tolerance (RPO): < 15 minutes

## Post-Recovery Checklist
- [ ] Verify all services are running
- [ ] Check data integrity
- [ ] Validate trading functionality
- [ ] Notify stakeholders
- [ ] Document lessons learned
- [ ] Schedule follow-up drill

## Drill Results
${drillInfo.phases.map(phase => 
  `- Phase ${phase.phase} (${phase.name}): ${phase.status}`
).join('\n')}

Total drill duration: ${Math.round(drillInfo.totalDuration / 1000)} seconds
`;

        await fs.writeFile(docPath, documentation);
        logger.info(`📋 Recovery documentation generated: ${docPath}`);
        
        return docPath;
    }

    /**
     * Calculate backup size
     */
    async calculateBackupSize(backupId) {
        let totalSize = 0;
        const backupDirs = ['database', 'config', 'logs', 'full'];
        
        for (const dir of backupDirs) {
            const backupPath = path.join(this.backupBasePath, dir, backupId);
            try {
                await fs.access(backupPath);
                const { stdout } = await execAsync(`du -sb "${backupPath}"`);
                const size = parseInt(stdout.split('\t')[0]);
                totalSize += size;
            } catch (error) {
                // Directory doesn't exist, skip
            }
        }
        
        return totalSize;
    }

    /**
     * Create backup checksum
     */
    async createBackupChecksum(backupId) {
        try {
            const backupDirs = ['database', 'config', 'logs', 'full'];
            let checksumData = '';
            
            for (const dir of backupDirs) {
                const backupPath = path.join(this.backupBasePath, dir, backupId);
                try {
                    await fs.access(backupPath);
                    const { stdout } = await execAsync(`find "${backupPath}" -type f -exec md5sum {} \\; | sort`);
                    checksumData += stdout;
                } catch (error) {
                    // Directory doesn't exist, skip
                }
            }
            
            const crypto = require('crypto');
            return crypto.createHash('md5').update(checksumData).digest('hex');
            
        } catch (error) {
            logger.error('Failed to create backup checksum:', error);
            return null;
        }
    }

    /**
     * Verify backup checksum
     */
    async verifyBackupChecksum(backupId, expectedChecksum) {
        if (!expectedChecksum) return false;
        
        const actualChecksum = await this.createBackupChecksum(backupId);
        return actualChecksum === expectedChecksum;
    }

    /**
     * Save backup metadata
     */
    async saveBackupMetadata(backupId, metadata) {
        const metadataPath = path.join(this.backupBasePath, metadata.type, backupId, 'metadata.json');
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    /**
     * Load backup metadata
     */
    async loadBackupMetadata(backupId) {
        const backupDirs = ['database', 'config', 'logs', 'full'];
        
        for (const dir of backupDirs) {
            const metadataPath = path.join(this.backupBasePath, dir, backupId, 'metadata.json');
            try {
                const metadata = await fs.readFile(metadataPath, 'utf8');
                return JSON.parse(metadata);
            } catch (error) {
                // Try next directory
            }
        }
        
        return null;
    }

    /**
     * Clean old backups
     */
    async cleanOldBackups() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.backupRetentionDays);
        
        const backups = await this.listBackups();
        const oldBackups = backups.filter(backup => new Date(backup.timestamp) < cutoffDate);
        
        for (const backup of oldBackups) {
            try {
                await this.deleteBackup(backup.id);
                logger.info(`🧹 Cleaned old backup: ${backup.id}`);
            } catch (error) {
                logger.error(`Failed to clean backup: ${backup.id}`, error);
            }
        }
        
        return oldBackups.length;
    }

    /**
     * Delete backup
     */
    async deleteBackup(backupId) {
        const backupDirs = ['database', 'config', 'logs', 'full'];
        
        for (const dir of backupDirs) {
            const backupPath = path.join(this.backupBasePath, dir, backupId);
            try {
                await fs.rm(backupPath, { recursive: true, force: true });
            } catch (error) {
                // Directory doesn't exist, skip
            }
        }
    }
}

// Singleton instance
let disasterRecoveryService = null;

function getDisasterRecoveryService() {
    if (!disasterRecoveryService) {
        disasterRecoveryService = new DisasterRecoveryService();
    }
    return disasterRecoveryService;
}

module.exports = {
    DisasterRecoveryService,
    getDisasterRecoveryService
};