/**
 * @file HealthMonitor.js
 * @description Simple health monitoring for Hubitat connection
 */

export class HealthMonitor {
    constructor(platform, hubitatClient) {
        this.logManager = platform.logManager;
        this.hubitatClient = hubitatClient;

        this.healthState = {
            isHealthy: true,
            lastCheck: Date.now(),
            consecutiveFailures: 0,
        };

        this.config = {
            checkInterval: 300000, // 5 minutes
            maxFailures: 3,
        };

        this.healthCheckInterval = null;
    }

    /**
     * Start health monitoring
     */
    startMonitoring() {
        this.logManager.logInfo("Health monitoring started");

        // Perform initial health check
        this.performHealthCheck();

        // Schedule regular health checks
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, this.config.checkInterval);
    }

    /**
     * Stop health monitoring
     */
    stopMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        this.logManager.logInfo("Health monitoring stopped");
    }

    /**
     * Perform a health check
     */
    async performHealthCheck() {
        try {
            await this.hubitatClient.updatePluginStatus();
            this.healthState.consecutiveFailures = 0;
            this.healthState.isHealthy = true;
            this.healthState.lastCheck = Date.now();
        } catch (error) {
            this.healthState.consecutiveFailures++;
            this.healthState.lastCheck = Date.now();

            if (this.healthState.consecutiveFailures >= this.config.maxFailures) {
                this.healthState.isHealthy = false;
                this.logManager.logError(`Plugin marked unhealthy after ${this.healthState.consecutiveFailures} failures: ${error.message}`);
            } else {
                this.logManager.logWarning(`Health check failed (attempt ${this.healthState.consecutiveFailures}/${this.config.maxFailures}): ${error.message}`);
            }
        }
    }

    /**
     * Get current health status
     */
    getHealthStatus() {
        return {
            isHealthy: this.healthState.isHealthy,
            lastCheck: this.healthState.lastCheck,
            consecutiveFailures: this.healthState.consecutiveFailures,
            timeSinceLastCheck: Date.now() - this.healthState.lastCheck,
        };
    }

    /**
     * Check if connection is healthy
     */
    isHealthy() {
        return this.healthState.isHealthy;
    }
}
