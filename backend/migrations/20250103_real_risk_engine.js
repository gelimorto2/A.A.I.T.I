/**
 * Real Risk Engine Database Migratio        // Insert default risk configuration
        await insertDefaultRiskConfiguration(knex);
        console.log('✅ Default risk configuration inserted');

        // Create performance indexes
        await createPerformanceIndexes(knex);
        console.log('✅ Performance indexes created');

        // Create triggers
        await createTriggers(knex);
        console.log('✅ Triggers created');s comprehensive risk management tables and schemas
 */

const {
    createRiskConfigurationTable,
    createRiskAuditTrailTable,
    createRiskViolationsTable,
    createRiskEnforcementActionsTable,
    createCircuitBreakersTable,
    createRiskMetricsView,
    insertDefaultRiskConfiguration,
    createPerformanceIndexes,
    createTriggers
} = require('../database/riskEngineSchema');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    console.log('🛡️  Creating Real Risk Engine tables...');

    try {
        // Create Risk Configuration table
        await createRiskConfigurationTable(knex);
        console.log('✅ Risk Configuration table created');

        // Create Risk Enforcement Actions table
        await createRiskEnforcementActionsTable(knex);
        console.log('✅ Risk Enforcement Actions table created');

        // Create Circuit Breakers table
        await createCircuitBreakersTable(knex);
        console.log('✅ Circuit Breakers table created');

        // Create Risk Metrics View
        await createRiskMetricsView(knex);
        console.log('✅ Risk Metrics view created');

        // Insert default risk configuration
        await insertDefaultRiskConfiguration(knex);
        console.log('✅ Default risk configuration inserted');

        // Create performance indexes
        await createPerformanceIndexes(knex);
        console.log('✅ Performance indexes created');

        // Create triggers
        await createTriggers(knex);
        console.log('✅ Database triggers created');

        console.log('🚀 Real Risk Engine database migration completed successfully');

    } catch (error) {
        console.error('❌ Real Risk Engine migration failed:', error);
        throw error;
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    console.log('🛡️  Rolling back Real Risk Engine tables...');

    try {
        // Drop views first
        await knex.raw('DROP VIEW IF EXISTS risk_metrics_summary CASCADE');
        console.log('✅ Risk Metrics view dropped');

        // Drop tables in reverse dependency order
        await knex.raw('DROP TABLE IF EXISTS risk_enforcement_actions CASCADE');
        console.log('✅ Risk Enforcement Actions table dropped');

        await knex.raw('DROP TABLE IF EXISTS risk_violations CASCADE');
        console.log('✅ Risk Violations table dropped');

        await knex.raw('DROP TABLE IF EXISTS circuit_breakers CASCADE');
        console.log('✅ Circuit Breakers table dropped');

        await knex.raw('DROP TABLE IF EXISTS risk_audit_trail CASCADE');
        console.log('✅ Risk Audit Trail table dropped');

        await knex.raw('DROP TABLE IF EXISTS risk_configuration CASCADE');
        console.log('✅ Risk Configuration table dropped');

        // Drop functions
        await knex.raw('DROP FUNCTION IF EXISTS update_risk_config_timestamp() CASCADE');
        await knex.raw('DROP FUNCTION IF EXISTS auto_deactivate_circuit_breakers() CASCADE');
        console.log('✅ Database functions dropped');

        console.log('🚀 Real Risk Engine rollback completed successfully');

    } catch (error) {
        console.error('❌ Real Risk Engine rollback failed:', error);
        throw error;
    }
};