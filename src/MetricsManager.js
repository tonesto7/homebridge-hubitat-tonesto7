/**
 * @file MetricsManager.js
 * @description Manages metrics collection for device updates and system performance
 */

import fs from "fs/promises";
import path from "path";

/**
 * AggregatedMetricsManager - Combines metrics from multiple plugin instances
 */
export class AggregatedMetricsManager {
    constructor() {
        this.metricsDir = path.join(process.cwd(), ".homebridge");
        this.instanceMetrics = new Map(); // instanceId -> metrics data
        this.lastUpdate = null;
    }

    /**
     * Load metrics from all instance files
     */
    async loadAllInstanceMetrics() {
        try {
            const files = await fs.readdir(this.metricsDir);
            const metricsFiles = files.filter((file) => file.startsWith("hubitat-metrics-") && file.endsWith(".json"));

            for (const file of metricsFiles) {
                const instanceId = file.replace("hubitat-metrics-", "").replace(".json", "");
                try {
                    const filePath = path.join(this.metricsDir, file);
                    const data = await fs.readFile(filePath, "utf8");
                    const metrics = JSON.parse(data);
                    this.instanceMetrics.set(instanceId, metrics);
                } catch (error) {
                    console.warn(`Failed to load metrics for instance ${instanceId}:`, error.message);
                }
            }

            this.lastUpdate = new Date().toISOString();
        } catch (error) {
            console.error("Failed to load instance metrics:", error.message);
        }
    }

    /**
     * Get aggregated metrics from all instances
     */
    getAggregatedMetrics() {
        const aggregated = {
            aggregated: true,
            lastUpdate: this.lastUpdate,
            instances: {},
            summary: {
                totalInstances: this.instanceMetrics.size,
                totalUpdates: 0,
                totalCommands: 0,
                totalErrors: 0,
                totalDevices: 0,
                instancesOnline: 0,
            },
            combined: {
                system: {},
                devices: [],
                attributes: {},
                errors: [],
                hourly: [],
            },
        };

        // Process each instance's metrics
        for (const [instanceId, metrics] of this.instanceMetrics) {
            aggregated.instances[instanceId] = metrics;

            // Aggregate system metrics
            if (metrics.system) {
                aggregated.summary.totalUpdates += metrics.system.totalUpdates || 0;
                aggregated.summary.totalCommands += metrics.system.totalCommands || 0;
                aggregated.summary.totalErrors += metrics.system.errors || 0;
                aggregated.summary.instancesOnline++;
            }

            // Aggregate devices
            if (metrics.devices) {
                aggregated.summary.totalDevices += metrics.devices.length;
                aggregated.combined.devices.push(
                    ...metrics.devices.map((device) => ({
                        ...device,
                        instanceId: instanceId,
                    })),
                );
            }

            // Aggregate attributes
            if (metrics.attributes) {
                for (const attr of metrics.attributes) {
                    const key = `${attr.attribute}`;
                    if (!aggregated.combined.attributes[key]) {
                        aggregated.combined.attributes[key] = { attribute: attr.attribute, count: 0 };
                    }
                    aggregated.combined.attributes[key].count += attr.count;
                }
            }

            // Aggregate errors
            if (metrics.errors) {
                aggregated.combined.errors.push(
                    ...metrics.errors.map((error) => ({
                        ...error,
                        instanceId: instanceId,
                    })),
                );
            }

            // Combine hourly data
            if (metrics.hourly) {
                aggregated.combined.hourly.push(
                    ...metrics.hourly.map((hour) => ({
                        ...hour,
                        instanceId: instanceId,
                    })),
                );
            }
        }

        // Convert attributes object to array and sort
        aggregated.combined.attributes = Object.values(aggregated.combined.attributes).sort((a, b) => b.count - a.count);

        // Sort combined devices by total updates
        aggregated.combined.devices.sort((a, b) => b.totalUpdates - a.totalUpdates);

        // Sort and limit errors (most recent first)
        aggregated.combined.errors.sort((a, b) => b.timestamp - a.timestamp);
        aggregated.combined.errors = aggregated.combined.errors.slice(0, 100);

        // Sort hourly data by timestamp
        aggregated.combined.hourly.sort((a, b) => b.timestamp - a.timestamp);

        return aggregated;
    }

    /**
     * Get metrics for a specific instance
     * @param {string} instanceId - Instance ID to get metrics for
     */
    getInstanceMetrics(instanceId) {
        return this.instanceMetrics.get(instanceId) || null;
    }

    /**
     * Get list of all instance IDs
     */
    getInstanceIds() {
        return Array.from(this.instanceMetrics.keys());
    }

    /**
     * Refresh metrics from all instances
     */
    async refreshMetrics() {
        await this.loadAllInstanceMetrics();
    }
}

export class MetricsManager {
    constructor(platform, instanceId = null) {
        this.logManager = platform.logManager;
        this.configManager = platform.configManager;

        // Instance identification
        this.instanceId = instanceId || platform.config?.client?.app_id || "default";
        this.instanceName = platform.config?.name || `Hubitat-${this.instanceId}`;

        // Persistence settings - instance-specific file
        this.metricsFile = path.join(process.cwd(), ".homebridge", `hubitat-metrics-${this.instanceId}.json`);
        this.saveInterval = 5 * 60 * 1000; // Save every 5 minutes
        this.saveTimer = null;

        // Device metrics storage
        this.deviceMetrics = new Map(); // deviceId -> metrics
        this.attributeMetrics = new Map(); // attributeName -> count

        // System metrics
        this.systemMetrics = {
            totalUpdates: 0,
            totalCommands: 0,
            startTime: Date.now(),
            lastResetTime: Date.now(),
            processingTimes: [],
            errors: 0,
            queueMetrics: {
                totalQueued: 0,
                totalProcessed: 0,
                maxQueueSize: 0,
                droppedUpdates: 0,
            },
        };

        // Command tracking
        this.commandMetrics = new Map(); // deviceId -> command metrics
        this.commandActivityWindow = [];

        // Error logging with context
        this.errorLog = [];
        this.maxErrorLogSize = 500;

        // Device history for modal display
        this.deviceHistory = new Map(); // deviceId -> array of events/commands
        this.maxDeviceHistorySize = 100;

        // Startup grace period - ignore metrics during initial device discovery
        // Allow configuration override, default to true (enabled)
        const graceEnabled = this.configManager.getConfig()?.metrics_startup_grace_enabled !== false;
        this.isInStartupGrace = graceEnabled;
        this.startupGracePeriod = null; // Will be calculated when ended
        this.startupGraceTimer = null;

        if (this.isInStartupGrace) {
            this.logManager.logInfo("Metrics startup grace period active - device updates will not be counted during initial discovery phase");
        } else {
            this.logManager.logInfo("Metrics startup grace period disabled - tracking all device updates immediately");
        }

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
        this.loadMetrics().catch((error) => {
            this.logManager.logWarn(`MetricsManager async initialization error: ${error.message}`);
        });

        this.logManager.logDebug("MetricsManager initialized");
    }

    /**
     * Record a command sent to Hubitat
     * @param {Object} commandData - Command information
     * @param {string} commandData.deviceId - Device ID
     * @param {string} commandData.deviceName - Device name
     * @param {string} commandData.command - Command name
     * @param {Array} commandData.parameters - Command parameters
     * @param {number} responseTime - Response time in ms
     * @param {boolean} success - Whether command was successful
     * @param {string} error - Error message if failed
     */
    recordCommand(commandData, responseTime = null, success = true, error = null) {
        // Skip metrics during startup grace period
        if (this.isInStartupGrace) {
            this.logManager.logDebug(`Skipping command metrics during startup grace period for device ${commandData.deviceName || "Unknown"} (${commandData.deviceId})`);
            return;
        }

        const now = Date.now();
        const deviceId = commandData.deviceId;
        const deviceName = commandData.deviceName || "Unknown Device";
        const command = commandData.command;

        this.logManager.logDebug(`Recording command metrics for device ${deviceName} (${deviceId}): ${command}`);

        // Update system metrics
        this.systemMetrics.totalCommands++;

        // Update device command metrics
        if (!this.commandMetrics.has(deviceId)) {
            this.commandMetrics.set(deviceId, {
                deviceId: deviceId,
                deviceName: deviceName,
                totalCommands: 0,
                successfulCommands: 0,
                failedCommands: 0,
                commands: new Map(),
                lastCommand: now,
                avgResponseTime: 0,
                responseTimes: [],
            });
        }

        const deviceCommandMetric = this.commandMetrics.get(deviceId);
        deviceCommandMetric.totalCommands++;
        deviceCommandMetric.lastCommand = now;
        deviceCommandMetric.deviceName = deviceName;

        if (success) {
            deviceCommandMetric.successfulCommands++;
        } else {
            deviceCommandMetric.failedCommands++;
            // Record command error
            this.recordError({
                message: error || "Command failed",
                type: "Command Error",
                deviceId: deviceId,
                deviceName: deviceName,
                context: { command, parameters: commandData.parameters },
            });
        }

        if (responseTime !== null) {
            deviceCommandMetric.responseTimes.push(responseTime);
            if (deviceCommandMetric.responseTimes.length > 100) {
                deviceCommandMetric.responseTimes.shift();
            }
            deviceCommandMetric.avgResponseTime = this.calculateAverage(deviceCommandMetric.responseTimes);
        }

        // Update command count for this device
        if (!(deviceCommandMetric.commands instanceof Map)) {
            deviceCommandMetric.commands = new Map(Object.entries(deviceCommandMetric.commands || {}));
        }
        const cmdCount = deviceCommandMetric.commands.get(command) || 0;
        deviceCommandMetric.commands.set(command, cmdCount + 1);

        // Track command activity
        const activityEntry = {
            deviceId: deviceId,
            deviceName: deviceName,
            command: command,
            parameters: commandData.parameters,
            timestamp: now,
            type: "command",
            success: success,
            error: error,
            responseTime: responseTime,
        };

        this.commandActivityWindow.push(activityEntry);

        // Maintain window size
        if (this.commandActivityWindow.length > this.activityWindowSize) {
            this.commandActivityWindow.shift();
        }

        // Add to device history for modal display
        this.addToDeviceHistory(deviceId, activityEntry);
    }

    /**
     * Add entry to device history
     * @private
     */
    addToDeviceHistory(deviceId, entry) {
        if (!this.deviceHistory.has(deviceId)) {
            this.deviceHistory.set(deviceId, []);
        }

        const history = this.deviceHistory.get(deviceId);
        history.push(entry);

        // Maintain history size per device
        if (history.length > this.maxDeviceHistorySize) {
            history.shift();
        }
    }

    /**
     * Get device history for modal display
     * @param {string} deviceId - Device ID
     * @returns {Array} Device history entries
     */
    getDeviceHistory(deviceId) {
        return this.deviceHistory.get(deviceId) || [];
    }

    /**
     * Get error log
     * @param {Object} options - Filter options
     * @param {string} options.type - Filter by error type
     * @param {string} options.deviceId - Filter by device ID
     * @param {number} options.limit - Limit number of results
     * @returns {Array} Filtered error log
     */
    getErrorLog(options = {}) {
        let errors = [...this.errorLog];

        if (options.type) {
            errors = errors.filter((error) => error.type === options.type);
        }

        if (options.deviceId) {
            errors = errors.filter((error) => error.deviceId === options.deviceId);
        }

        // Sort by most recent first
        errors.sort((a, b) => b.timestamp - a.timestamp);

        if (options.limit) {
            errors = errors.slice(0, options.limit);
        }

        return errors;
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = [];
        this.logManager.logInfo("Error log cleared");
    }

    /**
     * Get command statistics
     * @returns {Object} Command stats
     */
    getCommandStats() {
        const stats = {
            totalCommands: this.systemMetrics.totalCommands,
            deviceStats: [],
            successRate: 0,
            avgResponseTime: 0,
        };

        let totalSuccessful = 0;
        let totalFailed = 0;
        let allResponseTimes = [];

        for (const [_, commandMetric] of this.commandMetrics) {
            totalSuccessful += commandMetric.successfulCommands;
            totalFailed += commandMetric.failedCommands;
            allResponseTimes.push(...commandMetric.responseTimes);

            stats.deviceStats.push({
                deviceId: commandMetric.deviceId,
                deviceName: commandMetric.deviceName,
                totalCommands: commandMetric.totalCommands,
                successfulCommands: commandMetric.successfulCommands,
                failedCommands: commandMetric.failedCommands,
                successRate: commandMetric.totalCommands > 0 ? (commandMetric.successfulCommands / commandMetric.totalCommands) * 100 : 0,
                avgResponseTime: commandMetric.avgResponseTime,
                lastCommand: commandMetric.lastCommand,
            });
        }

        const totalCommands = totalSuccessful + totalFailed;
        stats.successRate = totalCommands > 0 ? (totalSuccessful / totalCommands) * 100 : 0;
        stats.avgResponseTime = this.calculateAverage(allResponseTimes);

        return stats;
    }

    /**
     * Get system health metrics
     * @returns {Object} System health data
     */
    getSystemHealth() {
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();

        return {
            memory: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
                rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
                external: Math.round(memoryUsage.external / 1024 / 1024), // MB
            },
            uptime: {
                seconds: Math.floor(uptime),
                formatted: this.formatDuration(uptime * 1000),
            },
            errorRate: this.systemMetrics.totalUpdates > 0 ? (this.systemMetrics.errors / this.systemMetrics.totalUpdates) * 100 : 0,
            lastErrorTime: this.errorLog.length > 0 ? this.errorLog[this.errorLog.length - 1].timestamp : null,
        };
    }

    /**
     * Record a device update
     * @param {Object} update - The device update object
     * @param {number} processingTime - Time taken to process the update in ms
     */
    recordDeviceUpdate(update, processingTime = null) {
        // Skip metrics during startup grace period to avoid counting initial device discovery
        if (this.isInStartupGrace) {
            this.logManager.logDebug(`Skipping metrics during startup grace period for device ${update.name || "Unknown"} (${update.deviceid})`);
            return;
        }

        const now = Date.now();
        const deviceId = update.deviceid;
        const deviceName = update.name || "Unknown Device";
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
                processingTimes: [],
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
        if (!(deviceMetric.attributes instanceof Map)) {
            deviceMetric.attributes = new Map(Object.entries(deviceMetric.attributes || {}));
        }
        const attrCount = deviceMetric.attributes.get(attribute) || 0;
        deviceMetric.attributes.set(attribute, attrCount + 1);

        // Update global attribute metrics
        const globalAttrCount = this.attributeMetrics.get(attribute) || 0;
        this.attributeMetrics.set(attribute, globalAttrCount + 1);

        // Track device activity for top devices calculation
        const activityEntry = {
            deviceId: deviceId,
            deviceName: deviceName,
            attribute: attribute,
            timestamp: now,
            type: "event",
            value: update.value,
        };

        this.deviceActivityWindow.push(activityEntry);

        // Maintain window size
        if (this.deviceActivityWindow.length > this.activityWindowSize) {
            this.deviceActivityWindow.shift();
        }

        // Add to device history for modal display
        this.addToDeviceHistory(deviceId, {
            ...activityEntry,
            processingTime: processingTime,
        });

        // Update current hour metrics
        this.updateHourlyMetrics();
    }

    /**
     * Record an error with context
     * @param {Object} errorData - Error information
     * @param {string} errorData.message - Error message
     * @param {string} errorData.type - Error type/category
     * @param {string} errorData.deviceId - Device ID if device-related
     * @param {string} errorData.deviceName - Device name if device-related
     * @param {string} errorData.stack - Stack trace
     * @param {Object} errorData.context - Additional context
     */
    recordError(errorData = {}) {
        this.systemMetrics.errors++;

        const errorEntry = {
            timestamp: Date.now(),
            message: errorData.message || "Unknown error",
            type: errorData.type || "General",
            deviceId: errorData.deviceId || null,
            deviceName: errorData.deviceName || null,
            stack: errorData.stack || null,
            context: errorData.context || {},
            id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };

        this.errorLog.push(errorEntry);

        // Maintain error log size
        if (this.errorLog.length > this.maxErrorLogSize) {
            this.errorLog.shift();
        }

        this.logManager.logDebug(`Recorded error: ${errorEntry.type} - ${errorEntry.message}`);
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
     * @param {number} windowHours - Time window in hours (default 1)
     * @returns {Array} Array of top devices with their metrics
     */
    getTopDevices(limit = 10, windowHours = 1) {
        const deviceCounts = new Map();
        const now = Date.now();
        const windowStart = now - windowHours * 60 * 60 * 1000;

        // Count recent activity from both events and commands
        const allActivity = [...this.deviceActivityWindow, ...this.commandActivityWindow];

        allActivity.forEach((activity) => {
            if (activity.timestamp > windowStart) {
                const count = deviceCounts.get(activity.deviceId) || {
                    deviceId: activity.deviceId,
                    deviceName: activity.deviceName,
                    count: 0,
                    events: 0,
                    commands: 0,
                };
                count.count++;
                if (activity.type === "event") {
                    count.events++;
                } else if (activity.type === "command") {
                    count.commands++;
                }
                deviceCounts.set(activity.deviceId, count);
            }
        });

        // If window is too large for activity window, also check stored device metrics
        if (windowHours > 1) {
            for (const [deviceId, metrics] of this.deviceMetrics) {
                if (!deviceCounts.has(deviceId) && metrics.lastUpdate > windowStart) {
                    deviceCounts.set(deviceId, {
                        deviceId: deviceId,
                        deviceName: metrics.deviceName,
                        count: Math.ceil(metrics.totalUpdates / 24), // Estimate activity
                        events: Math.ceil(metrics.totalUpdates / 24),
                        commands: 0,
                    });
                }
            }

            // Add command data for longer windows
            for (const [deviceId, commandMetrics] of this.commandMetrics) {
                const existing = deviceCounts.get(deviceId);
                if (existing && commandMetrics.lastCommand > windowStart) {
                    existing.commands += Math.ceil(commandMetrics.totalCommands / 24); // Estimate
                    existing.count += existing.commands;
                } else if (!existing && commandMetrics.lastCommand > windowStart) {
                    deviceCounts.set(deviceId, {
                        deviceId: deviceId,
                        deviceName: commandMetrics.deviceName,
                        count: Math.ceil(commandMetrics.totalCommands / 24),
                        events: 0,
                        commands: Math.ceil(commandMetrics.totalCommands / 24),
                    });
                }
            }
        }

        // Sort and return top devices
        return Array.from(deviceCounts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, limit)
            .map((device) => {
                const metrics = this.deviceMetrics.get(device.deviceId);
                const commandMetrics = this.commandMetrics.get(device.deviceId);
                return {
                    ...device,
                    totalUpdates: metrics ? metrics.totalUpdates : device.events,
                    totalCommands: commandMetrics ? commandMetrics.totalCommands : device.commands,
                    avgProcessingTime: metrics ? metrics.avgProcessingTime : 0,
                    avgResponseTime: commandMetrics ? commandMetrics.avgResponseTime : 0,
                    lastUpdate: metrics ? metrics.lastUpdate : null,
                    lastCommand: commandMetrics ? commandMetrics.lastCommand : null,
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
                p99: 0,
            };
        }

        const sorted = [...times].sort((a, b) => a - b);
        return {
            avg: this.calculateAverage(times),
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
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
            instance: {
                id: this.instanceId,
                name: this.instanceName,
                config: {
                    app_id: this.configManager.getConfig()?.client?.app_id,
                    app_url_local: this.configManager.getConfig()?.client?.app_url_local,
                    app_url_cloud: this.configManager.getConfig()?.client?.app_url_cloud,
                    use_cloud: this.configManager.getConfig()?.client?.use_cloud,
                },
            },
            system: {
                totalUpdates: this.systemMetrics.totalUpdates,
                totalCommands: this.systemMetrics.totalCommands,
                errors: this.systemMetrics.errors,
                uptime: this.formatDuration(uptime),
                uptimeMs: uptime,
                uptimeSinceReset: this.formatDuration(uptimeSince),
                uptimeSinceResetMs: uptimeSince,
                updatesPerMinute: this.calculateUpdatesPerMinute(),
                commandsPerMinute: this.calculateCommandsPerMinute(),
                isInStartupGrace: this.isInStartupGrace,
                startupGracePeriod: this.startupGracePeriod,
                ...this.systemMetrics.queueMetrics,
            },
            processing: this.getProcessingStats(),
            commands: this.getCommandStats(),
            systemHealth: this.getSystemHealth(),
            topDevices: this.getTopDevices(10, 1), // Default 1 hour window
            attributes: this.getAttributeStats(),
            devices: Array.from(this.deviceMetrics.values()).map((device) => {
                const commandData = this.commandMetrics.get(device.deviceId) || {};
                return {
                    deviceId: device.deviceId,
                    deviceName: device.deviceName,
                    totalUpdates: device.totalUpdates,
                    totalCommands: commandData.totalCommands || 0,
                    commandSuccessRate: commandData.totalCommands > 0 ? ((commandData.successfulCommands || 0) / commandData.totalCommands) * 100 : 0,
                    avgProcessingTime: device.avgProcessingTime,
                    avgResponseTime: commandData.avgResponseTime || 0,
                    lastUpdate: device.lastUpdate,
                    lastCommand: commandData.lastCommand || null,
                    attributes: Array.from((device.attributes instanceof Map ? device.attributes : new Map(Object.entries(device.attributes || {}))).entries()).map(([attr, count]) => ({
                        attribute: attr,
                        count: count,
                    })),
                };
            }),
            errors: this.getErrorLog({ limit: 50 }),
            errorStats: this.getErrorStats(),
            hourly: this.getHourlyStats(),
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Calculate commands per minute
     * @private
     */
    calculateCommandsPerMinute() {
        const uptime = Date.now() - this.systemMetrics.lastResetTime;
        const minutes = uptime / 60000;
        if (minutes < 1) return this.systemMetrics.totalCommands;
        return Math.round(this.systemMetrics.totalCommands / minutes);
    }

    /**
     * Get error statistics
     * @returns {Object} Error stats
     */
    getErrorStats() {
        const errorTypes = new Map();
        const deviceErrors = new Map();

        this.errorLog.forEach((error) => {
            // Count by type
            const typeCount = errorTypes.get(error.type) || 0;
            errorTypes.set(error.type, typeCount + 1);

            // Count by device
            if (error.deviceId) {
                const deviceCount = deviceErrors.get(error.deviceId) || {
                    deviceId: error.deviceId,
                    deviceName: error.deviceName,
                    count: 0,
                };
                deviceCount.count++;
                deviceErrors.set(error.deviceId, deviceCount);
            }
        });

        return {
            totalErrors: this.errorLog.length,
            recentErrors: this.errorLog.filter((e) => Date.now() - e.timestamp < 3600000).length, // Last hour
            errorTypes: Array.from(errorTypes.entries()).map(([type, count]) => ({ type, count })),
            deviceErrors: Array.from(deviceErrors.values()),
        };
    }

    /**
     * Load metrics from persistent storage
     */
    async loadMetrics() {
        try {
            const data = await fs.readFile(this.metricsFile, "utf8");
            const saved = JSON.parse(data);

            // Restore system metrics (but update timestamps)
            if (saved.systemMetrics) {
                this.systemMetrics = {
                    ...saved.systemMetrics,
                    startTime: saved.systemMetrics.startTime || Date.now(),
                    // Keep last reset time from saved data
                    lastResetTime: saved.systemMetrics.lastResetTime || Date.now(),
                    totalCommands: saved.systemMetrics.totalCommands || 0,
                };
            }

            // Restore command metrics
            if (saved.commandMetrics) {
                this.commandMetrics = new Map(saved.commandMetrics);
                // Ensure each command's commands map is a Map
                for (const [_, commandData] of this.commandMetrics) {
                    if (commandData.commands && !(commandData.commands instanceof Map)) {
                        commandData.commands = new Map(Object.entries(commandData.commands));
                    }
                }
            }

            // Restore error log
            if (saved.errorLog) {
                // Keep only recent errors (last 7 days)
                const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
                this.errorLog = saved.errorLog.filter((error) => error.timestamp > cutoff);
            }

            // Restore device history
            if (saved.deviceHistory) {
                this.deviceHistory = new Map(saved.deviceHistory);
                // Keep only recent history per device
                const historyLimit = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
                for (const [deviceId, history] of this.deviceHistory) {
                    this.deviceHistory.set(
                        deviceId,
                        history.filter((entry) => entry.timestamp > historyLimit),
                    );
                }
            }

            // Restore device metrics
            if (saved.deviceMetrics) {
                this.deviceMetrics = new Map(saved.deviceMetrics);
                // Ensure each device's attributes is a Map
                for (const [_, deviceData] of this.deviceMetrics) {
                    if (deviceData.attributes && !(deviceData.attributes instanceof Map)) {
                        deviceData.attributes = new Map(Object.entries(deviceData.attributes));
                    }
                }
            }

            // Restore attribute metrics
            if (saved.attributeMetrics) {
                this.attributeMetrics = new Map(saved.attributeMetrics);
            }

            // Restore hourly metrics (keep only recent ones)
            if (saved.hourlyMetrics) {
                const now = new Date();
                const cutoff = now.getTime() - 25 * 60 * 60 * 1000; // 25 hours ago
                this.hourlyMetrics = saved.hourlyMetrics.filter((h) => h.timestamp > cutoff);
            }

            // Don't restore device activity window - it's meant to be recent activity only

            this.logManager.logInfo(`Loaded metrics: ${this.systemMetrics.totalUpdates} total updates, ${this.deviceMetrics.size} devices`);
        } catch (error) {
            if (error.code !== "ENOENT") {
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
                deviceMetrics: Array.from(this.deviceMetrics.entries()).map(([deviceId, deviceData]) => [
                    deviceId,
                    {
                        ...deviceData,
                        attributes: deviceData.attributes instanceof Map ? Object.fromEntries(deviceData.attributes) : deviceData.attributes,
                    },
                ]),
                commandMetrics: Array.from(this.commandMetrics.entries()).map(([deviceId, commandData]) => [
                    deviceId,
                    {
                        ...commandData,
                        commands: commandData.commands instanceof Map ? Object.fromEntries(commandData.commands) : commandData.commands,
                    },
                ]),
                attributeMetrics: Array.from(this.attributeMetrics.entries()),
                errorLog: this.errorLog,
                deviceHistory: Array.from(this.deviceHistory.entries()),
                hourlyMetrics: this.hourlyMetrics,
                savedAt: Date.now(),
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
        this.systemMetrics.totalCommands = 0;
        this.systemMetrics.errors = 0;
        this.systemMetrics.processingTimes = [];
        this.systemMetrics.lastResetTime = Date.now();
        this.systemMetrics.queueMetrics = {
            totalQueued: 0,
            totalProcessed: 0,
            maxQueueSize: 0,
            droppedUpdates: 0,
        };
        this.deviceActivityWindow = [];
        this.commandActivityWindow = [];
        this.commandMetrics.clear();
        this.errorLog = [];
        this.deviceHistory.clear();
        this.hourlyMetrics = [];

        // Clear persisted data
        try {
            await fs.unlink(this.metricsFile);
            this.logManager.logInfo("Metrics have been reset and persisted data cleared");
        } catch (error) {
            if (error.code !== "ENOENT") {
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
            timestamp: Date.now(),
        };

        // Set up hourly rotation
        setInterval(() => {
            const currentHour = new Date().getHours();
            if (currentHour !== this.currentHour.hour) {
                // Save current hour metrics
                this.hourlyMetrics.push({ ...this.currentHour });

                // Keep only last 24 hours
                if (this.hourlyMetrics.length > 24) {
                    this.hourlyMetrics.shift();
                }

                // Reset for new hour
                this.currentHour = {
                    hour: currentHour,
                    updates: 0,
                    errors: 0,
                    timestamp: Date.now(),
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
            stats.push({ ...this.currentHour });
        }
        return stats;
    }

    /**
     * End startup grace period (called when platform finishes initial device discovery)
     */
    endStartupGracePeriod() {
        if (this.isInStartupGrace) {
            this.isInStartupGrace = false;
            this.startupGracePeriod = Date.now() - this.systemMetrics.startTime; // Calculate actual duration
            this.logManager.logInfo(`Metrics startup grace period ended after ${Math.round(this.startupGracePeriod / 1000)}s - now tracking all device updates`);
        }
    }

    /**
     * Check if currently in startup grace period
     * @returns {boolean}
     */
    isInStartupGracePeriod() {
        return this.isInStartupGrace;
    }

    /**
     * Dispose of the metrics manager
     */
    async dispose() {
        // End startup grace period if still active
        if (this.isInStartupGrace) {
            this.endStartupGracePeriod();
        }

        // Save final metrics before disposing
        await this.saveMetrics();

        // Clear timers
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
        }

        this.logManager.logDebug("MetricsManager disposed");
    }
}
