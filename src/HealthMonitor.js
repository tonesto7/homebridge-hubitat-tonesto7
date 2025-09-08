/**
 * @file HealthMonitor.js
 * @description Monitors connection health and implements auto-retry logic for multi-instance support
 */

export class HealthMonitor {
    constructor(platform, hubitatClient, pluginDiscovery = null) {
        this.logManager = platform.logManager;
        this.configManager = platform.configManager;
        this.config = platform.config;
        this.hubitatClient = hubitatClient;
        this.pluginDiscovery = pluginDiscovery;
        
        // Health monitoring state
        this.healthState = {
            isHealthy: true,
            lastSuccessfulCheck: Date.now(),
            consecutiveFailures: 0,
            totalChecks: 0,
            totalFailures: 0,
            avgResponseTime: 0,
            lastResponseTime: 0,
        };

        // Health check configuration
        this.healthConfig = {
            checkInterval: 60000, // Check every minute
            failureThreshold: 3, // Consider unhealthy after 3 consecutive failures
            timeoutThreshold: 10000, // Consider slow if response > 10s
            recoveryRequiredChecks: 2, // Require 2 successful checks to recover
            maxRetryAttempts: 5,
            retryBaseDelay: 2000, // Start with 2s delay
            retryMaxDelay: 30000, // Max 30s delay
        };

        // Auto-retry state
        this.retryState = {
            isRetrying: false,
            retryAttempt: 0,
            lastRetryTime: 0,
            backoffDelay: this.healthConfig.retryBaseDelay,
        };

        // Connection quality tracking
        this.connectionQuality = {
            score: 100, // Start with perfect score
            recentChecks: [], // Keep last 10 checks
            maxRecentChecks: 10,
        };

        this.healthCheckInterval = null;
        this.retryTimeout = null;

        // Subscribe to config updates
        this.configManager.onConfigUpdate((newConfig) => {
            this.config = newConfig;
        });
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
        }, this.healthConfig.checkInterval);
    }

    /**
     * Stop health monitoring
     */
    stopMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }
        
        this.logManager.logInfo("Health monitoring stopped");
    }

    /**
     * Perform a health check
     */
    async performHealthCheck() {
        const startTime = Date.now();
        this.healthState.totalChecks++;

        try {
            // Use the plugin status endpoint for health check
            const response = await this.hubitatClient.updatePluginStatus();
            const responseTime = Date.now() - startTime;
            
            this.healthState.lastResponseTime = responseTime;
            this.updateAverageResponseTime(responseTime);

            if (response && response.status !== 'error') {
                this.handleSuccessfulCheck(responseTime);
            } else {
                throw new Error(`Health check failed: ${response?.message || 'Unknown error'}`);
            }

        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.handleFailedCheck(error, responseTime);
        }
        
        // Update connection quality score
        this.updateConnectionQuality();
        
        // Log health status periodically
        if (this.healthState.totalChecks % 10 === 0) {
            this.logHealthStatus();
        }
    }

    /**
     * Handle successful health check
     */
    handleSuccessfulCheck(responseTime) {
        this.healthState.lastSuccessfulCheck = Date.now();
        this.healthState.consecutiveFailures = 0;
        
        const wasUnhealthy = !this.healthState.isHealthy;
        this.healthState.isHealthy = true;
        
        // Reset retry state on success
        if (this.retryState.isRetrying) {
            this.retryState.isRetrying = false;
            this.retryState.retryAttempt = 0;
            this.retryState.backoffDelay = this.healthConfig.retryBaseDelay;
            this.logManager.logSuccess("Connection recovered successfully");
        }
        
        if (wasUnhealthy) {
            this.logManager.logSuccess(`Health check passed - connection recovered (${responseTime}ms)`);
        }
        
        // Add to recent checks for quality tracking
        this.connectionQuality.recentChecks.push({
            timestamp: Date.now(),
            success: true,
            responseTime: responseTime,
            slow: responseTime > this.healthConfig.timeoutThreshold
        });
        
        // Keep only recent checks
        if (this.connectionQuality.recentChecks.length > this.connectionQuality.maxRecentChecks) {
            this.connectionQuality.recentChecks.shift();
        }
    }

    /**
     * Handle failed health check
     */
    handleFailedCheck(error, responseTime) {
        this.healthState.consecutiveFailures++;
        this.healthState.totalFailures++;
        
        // Add to recent checks
        this.connectionQuality.recentChecks.push({
            timestamp: Date.now(),
            success: false,
            responseTime: responseTime,
            error: error.message
        });
        
        if (this.connectionQuality.recentChecks.length > this.connectionQuality.maxRecentChecks) {
            this.connectionQuality.recentChecks.shift();
        }
        
        // Check if we should mark as unhealthy
        if (this.healthState.consecutiveFailures >= this.healthConfig.failureThreshold) {
            const wasHealthy = this.healthState.isHealthy;
            this.healthState.isHealthy = false;
            
            if (wasHealthy) {
                this.logManager.logError(`Health check failed ${this.healthState.consecutiveFailures} times - marking connection as unhealthy`);
                this.logManager.logError(`Last error: ${error.message}`);
                
                // Trigger discovery scan if configured
                if (this.config.multi_instance?.scan_on_health_failure && this.pluginDiscovery) {
                    this.logManager.logInfo("Triggering discovery scan due to health failure");
                    this.pluginDiscovery.triggerDiscoveryScan("health_failure").catch(err => {
                        this.logManager.logError(`Discovery scan failed: ${err.message}`);
                    });
                }
            }
            
            // Start auto-retry if not already retrying
            if (!this.retryState.isRetrying) {
                this.startAutoRetry();
            }
        } else {
            this.logManager.logWarn(`Health check failed (${this.healthState.consecutiveFailures}/${this.healthConfig.failureThreshold}): ${error.message}`);
        }
    }

    /**
     * Start auto-retry logic
     */
    startAutoRetry() {
        if (this.retryState.retryAttempt >= this.healthConfig.maxRetryAttempts) {
            this.logManager.logError(`Max retry attempts (${this.healthConfig.maxRetryAttempts}) reached - stopping auto-retry`);
            return;
        }
        
        this.retryState.isRetrying = true;
        this.retryState.retryAttempt++;
        this.retryState.lastRetryTime = Date.now();
        
        this.logManager.logInfo(`Starting auto-retry attempt ${this.retryState.retryAttempt}/${this.healthConfig.maxRetryAttempts} in ${this.retryState.backoffDelay}ms`);
        
        this.retryTimeout = setTimeout(async () => {
            await this.performRecoveryAttempt();
            
            // Exponential backoff for next retry
            this.retryState.backoffDelay = Math.min(
                this.retryState.backoffDelay * 2,
                this.healthConfig.retryMaxDelay
            );
            
            // If still unhealthy and under max attempts, schedule next retry
            if (!this.healthState.isHealthy && this.retryState.retryAttempt < this.healthConfig.maxRetryAttempts) {
                this.startAutoRetry();
            }
        }, this.retryState.backoffDelay);
    }

    /**
     * Perform recovery attempt
     */
    async performRecoveryAttempt() {
        this.logManager.logInfo(`Attempting recovery (attempt ${this.retryState.retryAttempt})`);
        
        try {
            // Try to re-register with Hubitat
            const response = await this.hubitatClient.registerForDirectUpdates();
            if (response && response.status !== 'error') {
                this.logManager.logSuccess("Recovery attempt successful");
                return true;
            } else {
                throw new Error('Registration failed');
            }
        } catch (error) {
            this.logManager.logError(`Recovery attempt ${this.retryState.retryAttempt} failed: ${error.message}`);
            
            // Trigger discovery scan on connection loss if configured
            if (this.config.multi_instance?.scan_on_connection_loss && 
                this.pluginDiscovery && 
                this.retryState.retryAttempt === this.healthConfig.maxRetryAttempts) {
                this.logManager.logInfo("Triggering discovery scan due to connection loss");
                this.pluginDiscovery.triggerDiscoveryScan("connection_loss").catch(err => {
                    this.logManager.logError(`Discovery scan failed: ${err.message}`);
                });
            }
            
            return false;
        }
    }

    /**
     * Update average response time
     */
    updateAverageResponseTime(newTime) {
        if (this.healthState.avgResponseTime === 0) {
            this.healthState.avgResponseTime = newTime;
        } else {
            // Moving average with weight of 0.1 for new value
            this.healthState.avgResponseTime = (this.healthState.avgResponseTime * 0.9) + (newTime * 0.1);
        }
    }

    /**
     * Update connection quality score
     */
    updateConnectionQuality() {
        if (this.connectionQuality.recentChecks.length === 0) return;
        
        const recent = this.connectionQuality.recentChecks;
        const successRate = recent.filter(check => check.success).length / recent.length;
        const avgResponseTime = recent
            .filter(check => check.success)
            .reduce((sum, check) => sum + check.responseTime, 0) / 
            recent.filter(check => check.success).length || 0;
        
        // Calculate score based on success rate and response times
        let score = successRate * 70; // 70% weight for success rate
        
        // Add response time component (30% weight)
        if (avgResponseTime > 0) {
            const responseScore = Math.max(0, 30 - (avgResponseTime / 1000 * 5)); // Penalty for slow responses
            score += responseScore;
        }
        
        this.connectionQuality.score = Math.round(Math.max(0, Math.min(100, score)));
    }

    /**
     * Log health status summary
     */
    logHealthStatus() {
        const uptime = Date.now() - this.healthState.lastSuccessfulCheck;
        const successRate = this.healthState.totalChecks > 0 ? 
            ((this.healthState.totalChecks - this.healthState.totalFailures) / this.healthState.totalChecks * 100).toFixed(1) : 100;
        
        this.logManager.logInfo(`Health Status - Healthy: ${this.healthState.isHealthy}, Quality: ${this.connectionQuality.score}%, Success Rate: ${successRate}%, Avg Response: ${Math.round(this.healthState.avgResponseTime)}ms`);
    }

    /**
     * Get current health status
     */
    getHealthStatus() {
        const timeSinceLastSuccess = Date.now() - this.healthState.lastSuccessfulCheck;
        const successRate = this.healthState.totalChecks > 0 ? 
            (this.healthState.totalChecks - this.healthState.totalFailures) / this.healthState.totalChecks * 100 : 100;

        return {
            isHealthy: this.healthState.isHealthy,
            connectionQuality: this.connectionQuality.score,
            successRate: Math.round(successRate * 10) / 10,
            consecutiveFailures: this.healthState.consecutiveFailures,
            lastSuccessfulCheck: this.healthState.lastSuccessfulCheck,
            timeSinceLastSuccess: timeSinceLastSuccess,
            avgResponseTime: Math.round(this.healthState.avgResponseTime),
            lastResponseTime: this.healthState.lastResponseTime,
            totalChecks: this.healthState.totalChecks,
            totalFailures: this.healthState.totalFailures,
            isRetrying: this.retryState.isRetrying,
            retryAttempt: this.retryState.retryAttempt,
            recentChecks: this.connectionQuality.recentChecks.slice(-5), // Last 5 checks
        };
    }

    /**
     * Manually trigger health check
     */
    async triggerHealthCheck() {
        this.logManager.logInfo("Manual health check triggered");
        await this.performHealthCheck();
        return this.getHealthStatus();
    }

    /**
     * Reset health statistics
     */
    resetStats() {
        this.healthState.totalChecks = 0;
        this.healthState.totalFailures = 0;
        this.healthState.avgResponseTime = 0;
        this.connectionQuality.recentChecks = [];
        this.connectionQuality.score = 100;
        this.logManager.logInfo("Health statistics reset");
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.stopMonitoring();
        this.logManager.logDebug("HealthMonitor disposed");
    }
}