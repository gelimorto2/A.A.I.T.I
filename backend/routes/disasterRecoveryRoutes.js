/**
 * Disaster Recovery API Routes
 * Endpoints for backup, restoration, and disaster recovery procedures
 */

const express = require('express');
const { getDisasterRecoveryService } = require('../services/disasterRecoveryService');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/disaster-recovery/status
 * Get disaster recovery service status
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const dr = getDisasterRecoveryService();
        const backups = await dr.listBackups();
        
        const status = {
            service: 'operational',
            backupDirectory: dr.backupBasePath,
            totalBackups: backups.length,
            latestBackup: backups.length > 0 ? backups[0] : null,
            backupTypes: Array.from(dr.backupTypes),
            retentionDays: dr.backupRetentionDays,
            systemHealth: {
                diskSpace: 'available', // Would implement actual disk space check
                permissions: 'valid',
                dependencies: 'ready'
            }
        };
        
        res.json({
            status: 'success',
            data: status,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Disaster recovery status retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve disaster recovery status', details: error.message });
    }
});

/**
 * GET /api/disaster-recovery/backups
 * List all available backups
 */
router.get('/backups', authenticateToken, async (req, res) => {
    try {
        const { type, limit = 50 } = req.query;
        
        const dr = getDisasterRecoveryService();
        const backups = await dr.listBackups(type);
        
        const limitedBackups = backups.slice(0, parseInt(limit));
        
        res.json({
            status: 'success',
            data: {
                backups: limitedBackups,
                total: backups.length,
                filtered: limitedBackups.length,
                types: [...new Set(backups.map(b => b.type))],
                oldestBackup: backups.length > 0 ? backups[backups.length - 1].timestamp : null,
                newestBackup: backups.length > 0 ? backups[0].timestamp : null
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Backup listing failed:', error);
        res.status(500).json({ error: 'Failed to list backups', details: error.message });
    }
});

/**
 * POST /api/disaster-recovery/backup
 * Create a new backup
 */
router.post('/backup', authenticateToken, async (req, res) => {
    try {
        const { type = 'full', metadata = {} } = req.body;
        
        const dr = getDisasterRecoveryService();
        
        if (!dr.backupTypes.has(type)) {
            return res.status(400).json({ 
                error: 'Invalid backup type', 
                validTypes: Array.from(dr.backupTypes) 
            });
        }
        
        logger.info(`📦 Creating ${type} backup requested by user`, { 
            user: req.user?.username,
            type,
            metadata 
        });
        
        // Start backup asynchronously
        const backupPromise = dr.createBackup(type, { metadata });
        
        // Return immediately with backup info
        res.json({
            status: 'success',
            message: `${type} backup started`,
            type,
            estimated_duration: getEstimatedDuration(type),
            timestamp: new Date().toISOString()
        });
        
        // Handle completion/failure asynchronously
        backupPromise.then(result => {
            logger.info(`✅ Backup completed: ${result.id}`, { 
                type: result.type,
                size: result.size,
                duration: result.duration 
            });
        }).catch(error => {
            logger.error('❌ Backup failed:', error);
        });
        
    } catch (error) {
        logger.error('Backup creation failed:', error);
        res.status(500).json({ error: 'Failed to create backup', details: error.message });
    }
});

/**
 * POST /api/disaster-recovery/validate/:backupId
 * Validate backup integrity
 */
router.post('/validate/:backupId', authenticateToken, async (req, res) => {
    try {
        const { backupId } = req.params;
        
        const dr = getDisasterRecoveryService();
        const validation = await dr.validateBackup(backupId);
        
        logger.info(`🔍 Backup validation: ${backupId}`, { 
            valid: validation.valid,
            checks: validation.checks?.length || 0,
            errors: validation.errors?.length || 0,
            user: req.user?.username
        });
        
        res.json({
            status: 'success',
            data: validation,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Backup validation failed:', error);
        res.status(500).json({ error: 'Failed to validate backup', details: error.message });
    }
});

/**
 * POST /api/disaster-recovery/restore/:backupId
 * Restore from backup
 */
router.post('/restore/:backupId', authenticateToken, async (req, res) => {
    try {
        const { backupId } = req.params;
        const { skipRestorationPoint = false, dryRun = false } = req.body;
        
        if (process.env.NODE_ENV === 'production' && !req.body.confirmRestore) {
            return res.status(400).json({
                error: 'Production restore requires explicit confirmation',
                message: 'Set confirmRestore: true in request body to proceed',
                warning: 'This will overwrite current data'
            });
        }
        
        const dr = getDisasterRecoveryService();
        
        logger.warn(`🚨 Restore operation initiated: ${backupId}`, { 
            user: req.user?.username,
            skipRestorationPoint,
            dryRun,
            environment: process.env.NODE_ENV
        });
        
        if (dryRun) {
            // Perform validation without actual restore
            const validation = await dr.validateBackup(backupId);
            
            res.json({
                status: 'success',
                dryRun: true,
                message: 'Dry run completed - no data was restored',
                validation,
                timestamp: new Date().toISOString()
            });
        } else {
            // Perform actual restore
            const restoreResult = await dr.restoreFromBackup(backupId, { 
                skipRestorationPoint 
            });
            
            res.json({
                status: 'success',
                message: 'Restore completed successfully',
                data: restoreResult,
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        logger.error('Restore operation failed:', error);
        res.status(500).json({ error: 'Failed to restore from backup', details: error.message });
    }
});

/**
 * POST /api/disaster-recovery/drill
 * Perform disaster recovery drill
 */
router.post('/drill', authenticateToken, async (req, res) => {
    try {
        logger.info('🚨 Disaster recovery drill initiated', { 
            user: req.user?.username,
            environment: process.env.NODE_ENV
        });
        
        const dr = getDisasterRecoveryService();
        const drillResult = await dr.performDisasterRecoveryDrill();
        
        res.json({
            status: 'success',
            message: 'Disaster recovery drill completed',
            data: drillResult,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Disaster recovery drill failed:', error);
        res.status(500).json({ error: 'Failed to perform disaster recovery drill', details: error.message });
    }
});

/**
 * GET /api/disaster-recovery/procedures
 * Get disaster recovery procedures documentation
 */
router.get('/procedures', authenticateToken, async (req, res) => {
    try {
        const procedures = {
            overview: 'A.A.I.T.I Disaster Recovery Procedures',
            phases: [
                {
                    phase: 1,
                    name: 'Assessment',
                    description: 'Assess the disaster scope and impact',
                    steps: [
                        'Identify affected systems',
                        'Determine data integrity status',
                        'Assess recovery time requirements'
                    ]
                },
                {
                    phase: 2,
                    name: 'Backup Selection',
                    description: 'Locate and validate appropriate backup',
                    steps: [
                        'List available backups',
                        'Select most recent valid backup',
                        'Validate backup integrity'
                    ]
                },
                {
                    phase: 3,
                    name: 'System Preparation',
                    description: 'Prepare system for restoration',
                    steps: [
                        'Stop all services safely',
                        'Create restoration point',
                        'Prepare restoration environment'
                    ]
                },
                {
                    phase: 4,
                    name: 'Data Restoration',
                    description: 'Restore data from backup',
                    steps: [
                        'Restore database files',
                        'Restore configuration files',
                        'Verify file integrity'
                    ]
                },
                {
                    phase: 5,
                    name: 'Service Recovery',
                    description: 'Restart and validate services',
                    steps: [
                        'Start core services',
                        'Verify system health',
                        'Test critical functionality'
                    ]
                },
                {
                    phase: 6,
                    name: 'Post-Recovery',
                    description: 'Complete recovery process',
                    steps: [
                        'Notify stakeholders',
                        'Document recovery process',
                        'Schedule follow-up review'
                    ]
                }
            ],
            rto: '1 hour', // Recovery Time Objective
            rpo: '15 minutes', // Recovery Point Objective
            contacts: {
                technical: 'Technical Lead',
                management: 'Operations Manager',
                external: 'Infrastructure Support'
            }
        };
        
        res.json({
            status: 'success',
            data: procedures,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Procedures retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve procedures', details: error.message });
    }
});

/**
 * DELETE /api/disaster-recovery/backups/:backupId
 * Delete specific backup
 */
router.delete('/backups/:backupId', authenticateToken, async (req, res) => {
    try {
        const { backupId } = req.params;
        
        const dr = getDisasterRecoveryService();
        await dr.deleteBackup(backupId);
        
        logger.info(`🗑️ Backup deleted: ${backupId}`, { 
            user: req.user?.username 
        });
        
        res.json({
            status: 'success',
            message: `Backup ${backupId} deleted successfully`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Backup deletion failed:', error);
        res.status(500).json({ error: 'Failed to delete backup', details: error.message });
    }
});

/**
 * POST /api/disaster-recovery/cleanup
 * Clean old backups based on retention policy
 */
router.post('/cleanup', authenticateToken, async (req, res) => {
    try {
        const dr = getDisasterRecoveryService();
        const cleanedCount = await dr.cleanOldBackups();
        
        logger.info(`🧹 Backup cleanup completed: ${cleanedCount} old backups removed`, { 
            user: req.user?.username 
        });
        
        res.json({
            status: 'success',
            message: 'Backup cleanup completed',
            cleanedBackups: cleanedCount,
            retentionDays: dr.backupRetentionDays,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Backup cleanup failed:', error);
        res.status(500).json({ error: 'Failed to cleanup old backups', details: error.message });
    }
});

/**
 * GET /api/disaster-recovery/dashboard
 * Get disaster recovery dashboard data
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const dr = getDisasterRecoveryService();
        const backups = await dr.listBackups();
        
        const now = new Date();
        const last24h = backups.filter(b => new Date(b.timestamp) > new Date(now - 24 * 60 * 60 * 1000));
        const last7d = backups.filter(b => new Date(b.timestamp) > new Date(now - 7 * 24 * 60 * 60 * 1000));
        
        const dashboard = {
            overview: {
                totalBackups: backups.length,
                last24Hours: last24h.length,
                last7Days: last7d.length,
                oldestBackup: backups.length > 0 ? backups[backups.length - 1].timestamp : null,
                newestBackup: backups.length > 0 ? backups[0].timestamp : null
            },
            backupTypes: {
                full: backups.filter(b => b.type === 'full').length,
                database: backups.filter(b => b.type === 'database').length,
                config: backups.filter(b => b.type === 'config').length,
                logs: backups.filter(b => b.type === 'logs').length
            },
            health: {
                status: backups.length > 0 ? 'healthy' : 'warning',
                lastBackup: backups.length > 0 ? backups[0].timestamp : null,
                backupFrequency: calculateBackupFrequency(backups),
                storageUsed: 'calculating...', // Would implement actual storage calculation
                retention: `${dr.backupRetentionDays} days`
            },
            recentBackups: backups.slice(0, 10).map(backup => ({
                id: backup.id,
                type: backup.type,
                status: backup.status,
                size: formatBytes(backup.size || 0),
                timestamp: backup.timestamp,
                filesCount: backup.files?.length || 0
            }))
        };
        
        res.json({
            status: 'success',
            data: dashboard,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Disaster recovery dashboard retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve disaster recovery dashboard', details: error.message });
    }
});

/**
 * Helper function to get estimated backup duration
 */
function getEstimatedDuration(type) {
    const durations = {
        database: '2-5 minutes',
        config: '30 seconds',
        logs: '1-2 minutes',
        full: '5-10 minutes'
    };
    return durations[type] || 'unknown';
}

/**
 * Helper function to calculate backup frequency
 */
function calculateBackupFrequency(backups) {
    if (backups.length < 2) return 'insufficient data';
    
    const intervals = [];
    for (let i = 0; i < Math.min(backups.length - 1, 10); i++) {
        const current = new Date(backups[i].timestamp);
        const next = new Date(backups[i + 1].timestamp);
        intervals.push(current - next);
    }
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const hours = Math.round(avgInterval / (1000 * 60 * 60));
    
    if (hours < 1) return 'very frequent';
    if (hours < 6) return `~${hours} hours`;
    if (hours < 24) return `~${hours} hours`;
    
    const days = Math.round(hours / 24);
    return `~${days} days`;
}

/**
 * Helper function to format bytes
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;