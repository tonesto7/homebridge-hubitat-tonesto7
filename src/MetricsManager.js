/**
 * @file MetricsManager.js
 * @description Manages metrics collection for device updates and system performance
 */

import fs from 'fs/promises';
import path from 'path';

export class MetricsManager {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.configManager = platform.configManager;
        
        // Persistence settings
        this.metricsFile = path.join(process.cwd(), '.homebridge', 'hubitat-metrics.json');
        this.saveInterval = 5 * 60 * 1000; // Save every 5 minutes
        this.saveTimer = null;
        
        // Device metrics storage
        this.deviceMetrics = new Map(); // deviceId -> metrics
        this.attributeMetrics = new Map(); // attributeName -> count
        
        // System metrics
        this.systemMetrics = {
            totalUpdates: 0,
            startTime: Date.now(),
            lastResetTime: Date.now(),
            processingTimes: [],
            errors: 0,
            queueMetrics: {
                totalQueued: 0,
                totalProcessed: 0,
                maxQueueSize: 0,
                droppedUpdates: 0
            }
        };
        
        // Time-based metrics (last hour, last 24 hours)
        this.hourlyMetrics = [];
        this.dailyMetrics = [];
        
        // Device activity tracking for top devices
        this.deviceActivityWindow = [];
        this.activityWindowSize = 1000; // Keep last 1000 updates for activity analysis
        
        // Start hourly collection immediately (synchronous)
        this.startHourlyCollection();
        this.startPeriodicSaving();
        
        // Load saved data asynchronously (don't block constructor)
        this.loadMetrics().catch(error => {
            this.logManager.logWarn(`MetricsManager async initialization error: ${error.message}`);
        });
        
        this.logManager.logDebug("MetricsManager initialized");
    }
    
    /**
     * Record a device update
     * @param {Object} update - The device update object
     * @param {number} processingTime - Time taken to process the update in ms
     */
    recordDeviceUpdate(update, processingTime = null) {
        const now = Date.now();
        const deviceId = update.deviceid;
        const deviceName = update.name || 'Unknown Device';
        const attribute = update.attribute;
        
        this.logManager.logDebug(`Recording metrics for device ${deviceName} (${deviceId}): ${attribute} = ${update.value}`);
        
        // Update system metrics
        this.systemMetrics.totalUpdates++;
        
        if (processingTime !== null) {
            this.systemMetrics.processingTimes.push(processingTime);
            // Keep only last 1000 processing times
            if (this.systemMetrics.processingTimes.length > 1000) {
                this.systemMetrics.processingTimes.shift();
            }
        }
        
        // Update device metrics
        if (!this.deviceMetrics.has(deviceId)) {
            this.deviceMetrics.set(deviceId, {
                deviceId: deviceId,
                deviceName: deviceName,
                totalUpdates: 0,
                attributes: new Map(),
                lastUpdate: now,
                firstUpdate: now,
                avgProcessingTime: 0,
                processingTimes: []
            });
        }
        
        const deviceMetric = this.deviceMetrics.get(deviceId);
        deviceMetric.totalUpdates++;
        deviceMetric.lastUpdate = now;
        deviceMetric.deviceName = deviceName; // Update name in case it changed
        
        if (processingTime !== null) {
            deviceMetric.processingTimes.push(processingTime);
            if (deviceMetric.processingTimes.length > 100) {
                deviceMetric.processingTimes.shift();
            }
            deviceMetric.avgProcessingTime = this.calculateAverage(deviceMetric.processingTimes);
        }
        
        // Update attribute count for this device
        const attrCount = deviceMetric.attributes.get(attribute) || 0;
        deviceMetric.attributes.set(attribute, attrCount + 1);
        
        // Update global attribute metrics
        const globalAttrCount = this.attributeMetrics.get(attribute) || 0;
        this.attributeMetrics.set(attribute, globalAttrCount + 1);
        
        // Track device activity for top devices calculation
        this.deviceActivityWindow.push({
            deviceId: deviceId,
            deviceName: deviceName,
            attribute: attribute,
            timestamp: now
        });
        
        // Maintain window size
        if (this.deviceActivityWindow.length > this.activityWindowSize) {
            this.deviceActivityWindow.shift();
        }
        
        // Update current hour metrics
        this.updateHourlyMetrics();
    }
    
    /**
     * Record an error
     */
    recordError() {
        this.systemMetrics.errors++;
    }
    
    /**
     * Record queue metrics
     * @param {Object} queueStats - Queue statistics
     */
    recordQueueMetrics(queueStats) {
        if (queueStats.queued !== undefined) {
            this.systemMetrics.queueMetrics.totalQueued++;
        }
        if (queueStats.processed !== undefined) {
            this.systemMetrics.queueMetrics.totalProcessed++;
        }
        if (queueStats.queueSize !== undefined && queueStats.queueSize > this.systemMetrics.queueMetrics.maxQueueSize) {
            this.systemMetrics.queueMetrics.maxQueueSize = queueStats.queueSize;
        }
        if (queueStats.dropped !== undefined) {
            this.systemMetrics.queueMetrics.droppedUpdates++;
        }
    }
    
    /**
     * Get top devices by activity
     * @param {number} limit - Number of top devices to return
     * @returns {Array} Array of top devices with their metrics
     */
    getTopDevices(limit = 10) {
        const deviceCounts = new Map();
        const now = Date.now();
        const windowStart = now - (60 * 60 * 1000); // Last hour
        
        // Count recent activity
        this.deviceActivityWindow.forEach(activity => {
            if (activity.timestamp > windowStart) {
                const count = deviceCounts.get(activity.deviceId) || { 
                    deviceId: activity.deviceId, 
                    deviceName: activity.deviceName, 
                    count: 0 
                };
                count.count++;
                deviceCounts.set(activity.deviceId, count);
            }
        });
        
        // Sort and return top devices
        return Array.from(deviceCounts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, limit)
            .map(device => {
                const metrics = this.deviceMetrics.get(device.deviceId);
                return {
                    ...device,
                    totalUpdates: metrics ? metrics.totalUpdates : device.count,
                    avgProcessingTime: metrics ? metrics.avgProcessingTime : 0,
                    lastUpdate: metrics ? metrics.lastUpdate : null
                };
            });
    }
    
    /**
     * Get attribute statistics
     * @returns {Array} Array of attributes with their counts
     */
    getAttributeStats() {
        return Array.from(this.attributeMetrics.entries())
            .map(([attribute, count]) => ({ attribute, count }))
            .sort((a, b) => b.count - a.count);
    }
    
    /**
     * Get processing time statistics
     * @returns {Object} Processing time stats
     */
    getProcessingStats() {
        const times = this.systemMetrics.processingTimes;
        if (times.length === 0) {
            return {
                avg: 0,
                min: 0,
                max: 0,
                median: 0,
                p95: 0,
                p99: 0
            };
        }
        
        const sorted = [...times].sort((a, b) => a - b);
        return {
            avg: this.calculateAverage(times),
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)]
        };
    }
    
    /**
     * Get all metrics
     * @returns {Object} Complete metrics object
     */
    getAllMetrics() {
        const now = Date.now();
        const uptime = now - this.systemMetrics.startTime;
        const uptimeSince = now - this.systemMetrics.lastResetTime;
        
        return {
            system: {
                totalUpdates: this.systemMetrics.totalUpdates,
                errors: this.systemMetrics.errors,
                uptime: this.formatDuration(uptime),
                uptimeMs: uptime,
                uptimeSinceReset: this.formatDuration(uptimeSince),
                uptimeSinceResetMs: uptimeSince,
                updatesPerMinute: this.calculateUpdatesPerMinute(),
                ...this.systemMetrics.queueMetrics
            },
            processing: this.getProcessingStats(),
            topDevices: this.getTopDevices(10),
            attributes: this.getAttributeStats(),
            devices: Array.from(this.deviceMetrics.values()).map(device => ({
                deviceId: device.deviceId,
                deviceName: device.deviceName,
                totalUpdates: device.totalUpdates,
                avgProcessingTime: device.avgProcessingTime,
                lastUpdate: device.lastUpdate,
                attributes: Array.from(device.attributes.entries()).map(([attr, count]) => ({
                    attribute: attr,
                    count: count
                }))
            })),
            hourly: this.getHourlyStats(),
            timestamp: new Date().toISOString()
        };
    }
    
    
    /**
     * Load metrics from persistent storage
     */
    async loadMetrics() {
        try {
            const data = await fs.readFile(this.metricsFile, 'utf8');
            const saved = JSON.parse(data);
            
            // Restore system metrics (but update timestamps)
            if (saved.systemMetrics) {
                this.systemMetrics = {
                    ...saved.systemMetrics,
                    startTime: saved.systemMetrics.startTime || Date.now(),
                    // Keep last reset time from saved data
                    lastResetTime: saved.systemMetrics.lastResetTime || Date.now()
                };
            }
            
            // Restore device metrics
            if (saved.deviceMetrics) {
                this.deviceMetrics = new Map(saved.deviceMetrics);
            }
            
            // Restore attribute metrics
            if (saved.attributeMetrics) {
                this.attributeMetrics = new Map(saved.attributeMetrics);
            }
            
            // Restore hourly metrics (keep only recent ones)
            if (saved.hourlyMetrics) {
                const now = new Date();
                const cutoff = now.getTime() - (25 * 60 * 60 * 1000); // 25 hours ago
                this.hourlyMetrics = saved.hourlyMetrics.filter(h => h.timestamp > cutoff);
            }
            
            // Don't restore device activity window - it's meant to be recent activity only
            
            this.logManager.logInfo(`Loaded metrics: ${this.systemMetrics.totalUpdates} total updates, ${this.deviceMetrics.size} devices`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.logManager.logWarn(`Error loading metrics: ${error.message}`);
            }
            // File doesn't exist or is corrupted - start fresh
        }
    }
    
    /**
     * Save metrics to persistent storage
     */
    async saveMetrics() {
        try {
            // Ensure .homebridge directory exists
            const homebridgeDir = path.dirname(this.metricsFile);
            await fs.mkdir(homebridgeDir, { recursive: true });
            
            const data = {
                systemMetrics: this.systemMetrics,
                deviceMetrics: Array.from(this.deviceMetrics.entries()),
                attributeMetrics: Array.from(this.attributeMetrics.entries()),
                hourlyMetrics: this.hourlyMetrics,
                savedAt: Date.now()
            };
            
            await fs.writeFile(this.metricsFile, JSON.stringify(data, null, 2));
            this.logManager.logDebug(`Metrics saved to ${this.metricsFile}`);
        } catch (error) {
            this.logManager.logError(`Error saving metrics: ${error.message}`);
        }
    }
    
    /**
     * Start periodic saving of metrics
     */
    startPeriodicSaving() {
        this.saveTimer = setInterval(() => {
            this.saveMetrics();
        }, this.saveInterval);
    }
    
    /**
     * Reset metrics and clear persisted data
     */
    async resetMetrics() {
        this.deviceMetrics.clear();
        this.attributeMetrics.clear();
        this.systemMetrics.totalUpdates = 0;
        this.systemMetrics.errors = 0;
        this.systemMetrics.processingTimes = [];
        this.systemMetrics.lastResetTime = Date.now();
        this.systemMetrics.queueMetrics = {
            totalQueued: 0,
            totalProcessed: 0,
            maxQueueSize: 0,
            droppedUpdates: 0
        };
        this.deviceActivityWindow = [];
        this.hourlyMetrics = [];
        
        // Clear persisted data
        try {
            await fs.unlink(this.metricsFile);
            this.logManager.logInfo("Metrics have been reset and persisted data cleared");
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.logManager.logWarn(`Error clearing persisted metrics: ${error.message}`);
            }
            this.logManager.logInfo("Metrics have been reset");
        }
    }
    
    /**
     * Calculate average of an array of numbers
     * @private
     */
    calculateAverage(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    
    /**
     * Format duration in ms to human readable
     * @private
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    /**
     * Calculate updates per minute
     * @private
     */
    calculateUpdatesPerMinute() {
        const uptime = Date.now() - this.systemMetrics.lastResetTime;
        const minutes = uptime / 60000;
        if (minutes < 1) return this.systemMetrics.totalUpdates;
        return Math.round(this.systemMetrics.totalUpdates / minutes);
    }
    
    /**
     * Start hourly metrics collection
     * @private
     */
    startHourlyCollection() {
        // Initialize current hour
        this.currentHour = {
            hour: new Date().getHours(),
            updates: 0,
            errors: 0,
            timestamp: Date.now()
        };
        
        // Set up hourly rotation
        setInterval(() => {
            const currentHour = new Date().getHours();
            if (currentHour !== this.currentHour.hour) {
                // Save current hour metrics
                this.hourlyMetrics.push({...this.currentHour});
                
                // Keep only last 24 hours
                if (this.hourlyMetrics.length > 24) {
                    this.hourlyMetrics.shift();
                }
                
                // Reset for new hour
                this.currentHour = {
                    hour: currentHour,
                    updates: 0,
                    errors: 0,
                    timestamp: Date.now()
                };
            }
        }, 60000); // Check every minute
    }
    
    /**
     * Update current hour metrics
     * @private
     */
    updateHourlyMetrics() {
        if (this.currentHour) {
            this.currentHour.updates++;
        }
    }
    
    /**
     * Get hourly statistics
     * @private
     */
    getHourlyStats() {
        const stats = [...this.hourlyMetrics];
        if (this.currentHour) {
            stats.push({...this.currentHour});
        }
        return stats;
    }
    
    /**
     * Dispose of the metrics manager
     */
    async dispose() {
        // Save final metrics before disposing
        await this.saveMetrics();
        
        // Clear timers
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
        }
        
        this.logManager.logDebug("MetricsManager disposed");
    }
}