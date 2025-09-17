/**
 * @file HubitatClient.js
 * @description Manages communication with the Hubitat hub and handles command batching
 */

import { platformName, pluginVersion } from "./StaticConst.js";
import axios from "axios";
import http from "http";
import https from "https";

export default class HubitatClient {
    /**
     * @param {Object} params
     * @param {LogManager} params.logManager - Logger instance
     * @param {VersionManager} params.versionManager - Version manager instance
     * @param {ConfigManager} params.configManager - Config manager instance
     * @param {EventEmitter} params.appEvts - Event emitter instance
     * @param {Function} params.getHealthMetrics - Function to get health metrics
     * @param {Function} params.getAccessoryCount - Function to get accessory count
     */
    constructor(platform) {
        this.platform = platform;
        this.logManager = platform.logManager;
        this.versionManager = platform.versionManager;
        this.configManager = platform.configManager;
        this.appEvts = platform.appEvts;
        this.getHealthMetrics = platform.getHealthMetrics;
        this.getAllCachedAccessories = platform.getAllCachedAccessories.bind(platform);
        this.config = this.configManager.getConfig();

        // Command batching state
        this.commandState = {
            queue: [],
            batchTimer: null,
            timers: new Map(),
            lastExecutions: new Map(),
            batchSize: 10,
            batchDelay: 25,
            maxBatchDelay: 100,
        };

        // Retry configuration
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            failures: new Map(),
            failureThreshold: 5,
            resetTimeout: 60000,
        };

        // Register event listeners
        this.registerEventListeners();

        // Subscribe to config updates
        this.configManager.onConfigUpdate((newConfig) => {
            this.config = newConfig;
            this.logManager.logDebug("HubitatClient config updated");
        });

        // Enhanced connection pooling configuration
        this.connectionConfig = {
            maxSockets: 20, // Increase from 15
            maxFreeSockets: 10, // Increase from 5
            timeout: 30000,
            keepAliveMsecs: 5000, // Increase from 2000
            keepAlive: true,
            maxSocketsPerHost: 15, // Increase from 10
            // Add connection cleanup
            freeSocketTimeout: 30000, // Close idle sockets after 30s
            maxCachedSessions: 10,
        };

        // Configure axios with enhanced connection pooling
        this.httpAgent = new http.Agent({
            ...this.connectionConfig,
            scheduling: "fifo", // Use FIFO scheduling for fairness
        });

        this.httpsAgent = new https.Agent({
            ...this.connectionConfig,
            scheduling: "fifo",
        });

        this.axiosInstance = axios.create({
            httpAgent: this.httpAgent,
            httpsAgent: this.httpsAgent,
            // Add connection pool monitoring
            timeout: 30000,
        });

        // Connection pool monitoring
        this.connectionStats = {
            totalRequests: 0,
            activeConnections: 0,
            pooledConnections: 0,
            errors: 0,
            lastReset: Date.now(),
        };

        // Monitor connection pool stats every 30 seconds
        this.statsInterval = setInterval(() => {
            this.updateConnectionStats();
            this.cleanupIdleConnections();
        }, 30000);

        // Attribute update batching
        this.attributeUpdateQueue = new Map(); // deviceId -> Set of updates
        this.attributeBatchTimer = null;
        this.attributeBatchDelay = 100;
    }

    registerEventListeners() {
        this.appEvts.on("event:update_plugin_status", this.handleUpdatePluginStatus.bind(this));
        this.appEvts.on("event:register_for_direct_updates", this.handleRegisterForDirectUpdates.bind(this));
    }

    async handleUpdatePluginStatus() {
        try {
            const response = await this.updatePluginStatus();

            // Validate health check response if this is a health check
            if (this.platform && this.platform.validateHealthCheckResponse) {
                const validation = this.platform.validateHealthCheckResponse(response);

                if (validation.valid) {
                    this.platform.healthCheckMonitor.lastSuccessfulCheck = Date.now();
                    this.platform.healthCheckMonitor.consecutiveFailures = 0;
                    this.platform.healthCheckMonitor.isHealthy = true;
                    this.logManager.logDebug("Health check validation successful");
                } else {
                    this.platform.healthCheckMonitor.consecutiveFailures++;
                    this.logManager.logWarn(`Health check validation failed: ${validation.reason}`);

                    if (this.platform.healthCheckMonitor.consecutiveFailures >= this.platform.healthCheckMonitor.maxConsecutiveFailures) {
                        this.platform.healthCheckMonitor.isHealthy = false;
                        this.logManager.logError("Plugin marked as unhealthy due to repeated validation failures");
                    }
                }
            }
        } catch (error) {
            if (this.platform && this.platform.healthCheckMonitor) {
                this.platform.healthCheckMonitor.consecutiveFailures++;
                this.logManager.logError("Health check failed:", error);
            }
        }
    }

    async handleRegisterForDirectUpdates() {
        await this.registerForDirectUpdates();
    }

    async processBatch() {
        if (!this.commandState.queue.length) return;

        const commands = this.commandState.queue.splice(0, this.commandState.batchSize);
        this.commandState.batchTimer = null;
        const startTime = Date.now();
        let success = false;
        let error = null;

        try {
            const formattedCommands = commands.map((cmd) => ({
                deviceId: cmd.devData.deviceid,
                command: cmd.command,
                params: Array.isArray(cmd.params) ? cmd.params : [cmd.params],
            }));

            await this.makeRequest({
                method: "post",
                endpoint: "deviceCmds",
                data: { commands: formattedCommands },
                additionalHeaders: {
                    evtsource: `Homebridge_${platformName}_${this.config.client.app_id}`,
                    evttype: "hkCommand",
                },
                timeout: 5000,
            });
            success = true;
        } catch (err) {
            success = false;
            error = err.message;
            this.handleError("processBatch", err);
            // Fall back to individual commands - metrics will be recorded in sendSingleCommand
            for (const cmd of commands) {
                await this.sendSingleCommand(cmd.devData, cmd.command, cmd.params);
            }
            return; // Skip metrics recording as individual commands will handle it
        }

        // Record batch command metrics only if successful
        if (success && this.platform.metricsManager) {
            const responseTime = Date.now() - startTime;
            // Record metrics for each command in the batch
            for (const cmd of commands) {
                this.platform.metricsManager.recordCommand(
                    {
                        deviceId: cmd.devData.deviceid,
                        deviceName: cmd.devData.name,
                        command: cmd.command,
                        parameters: cmd.params,
                    },
                    responseTime / commands.length,
                    success,
                    error,
                ); // Divide response time among commands
            }
        }

        // Process remaining queue if any
        if (this.commandState.queue.length) {
            this.scheduleBatchProcessing();
        }
    }

    async sendSingleCommand(devData, cmd, params) {
        const startTime = Date.now();
        let success = false;
        let error = null;

        try {
            await this.makeRequest({
                method: "post",
                endpoint: "deviceCmd",
                data: {
                    deviceId: devData.deviceid,
                    command: cmd,
                    params: params,
                },
                additionalHeaders: {
                    evtsource: `Homebridge_${platformName}_${this.config.client.app_id}`,
                    evttype: "hkCommand",
                },
                timeout: 5000,
            });
            success = true;
            return true;
        } catch (err) {
            success = false;
            error = err.message;
            this.handleError("sendSingleCommand", err);
            return false;
        } finally {
            // Record command metrics
            const responseTime = Date.now() - startTime;
            if (this.platform.metricsManager) {
                this.platform.metricsManager.recordCommand(
                    {
                        deviceId: devData.deviceid,
                        deviceName: devData.name,
                        command: cmd,
                        parameters: params,
                    },
                    responseTime,
                    success,
                    error,
                );
            }
        }
    }

    async sendHubitatCommand(devData, cmd, params = []) {
        try {
            this.logManager.logBrightBlue(`Queueing Device Command: ${cmd}${params.length ? ` | Params: ${JSON.stringify(params)}` : ""} | ` + `Name: (${devData.name}) | DeviceID: (${devData.deviceid})`);

            // Add command to batch queue
            this.commandState.queue.push({ devData, command: cmd, params });
            this.commandState.lastExecutions.set(cmd, Date.now());

            // If queue reaches batch size, process immediately
            if (this.commandState.queue.length >= this.commandState.batchSize) {
                await this.processBatch();
            } else {
                this.scheduleBatchProcessing();
            }

            return true;
        } catch (error) {
            this.handleError("sendHubitatCommand", error);
            return false;
        }
    }

    scheduleBatchProcessing() {
        if (this.commandState.batchTimer) return;

        this.commandState.batchTimer = setTimeout(() => this.processBatch(), Math.min(this.commandState.batchDelay, this.commandState.maxBatchDelay));
    }

    handleError(source, error) {
        const errorMap = {
            401: "Hubitat Token Error",
            403: "Hubitat Authentication Error",
            429: "Too Many Requests - Rate Limited",
            500: "Hubitat Server Error",
            502: "Bad Gateway",
            503: "Service Unavailable",
            504: "Gateway Timeout",
        };

        let errorMessage = "";

        if (error.response?.status) {
            errorMessage = errorMap[error.response.status] || `HTTP Error ${error.response.status}`;
        } else if (error.code === "ECONNABORTED") {
            errorMessage = "Request Timeout";
        } else if (error.message?.startsWith("getaddrinfo EAI_AGAIN")) {
            errorMessage = "DNS Resolution Failed - Check Network Connection";
        } else {
            errorMessage = error.message || "Unknown Error";
        }

        this.logManager.logError(`${source} Error | ${errorMessage} | ` + `Details: ${error.response?.data || error.message}`);
        this.logManager.logDebug(`${source} Full Error: ${JSON.stringify(error)}`);

        // Record error in metrics if available
        if (this.platform.metricsManager) {
            this.platform.metricsManager.recordError({
                message: errorMessage,
                type: source === "sendSingleCommand" || source === "processBatch" ? "Command Error" : source === "getDevices" ? "Device Discovery Error" : source === "updatePluginStatus" ? "Plugin Status Error" : source === "registerForDirectUpdates" ? "Registration Error" : "Client Error",
                stack: error.stack,
                context: {
                    source: source,
                    statusCode: error.response?.status,
                    errorCode: error.code,
                    url: error.config?.url,
                    method: error.config?.method,
                },
            });
        }
    }

    updateConnectionStats() {
        try {
            // Get HTTP agent stats
            const httpSockets = this.httpAgent.sockets || {};
            const httpFreeSockets = this.httpAgent.freeSockets || {};
            const httpsTotalSockets = this.httpsAgent.sockets || {};
            const httpsFreeSockets = this.httpsAgent.freeSockets || {};

            let activeSockets = 0;
            let freeSockets = 0;

            // Count active HTTP sockets
            Object.values(httpSockets).forEach((socketArray) => {
                if (Array.isArray(socketArray)) {
                    activeSockets += socketArray.length;
                }
            });

            // Count free HTTP sockets
            Object.values(httpFreeSockets).forEach((socketArray) => {
                if (Array.isArray(socketArray)) {
                    freeSockets += socketArray.length;
                }
            });

            // Count HTTPS sockets
            Object.values(httpsTotalSockets).forEach((socketArray) => {
                if (Array.isArray(socketArray)) {
                    activeSockets += socketArray.length;
                }
            });

            Object.values(httpsFreeSockets).forEach((socketArray) => {
                if (Array.isArray(socketArray)) {
                    freeSockets += socketArray.length;
                }
            });

            this.connectionStats.activeConnections = activeSockets;
            this.connectionStats.pooledConnections = freeSockets;

            this.logManager.logDebug(`Connection pool stats - Active: ${activeSockets}, Pooled: ${freeSockets}, Total requests: ${this.connectionStats.totalRequests}, Errors: ${this.connectionStats.errors}`);
        } catch (error) {
            this.logManager.logError("Error updating connection stats:", error);
        }
    }

    getConnectionStats() {
        return {
            ...this.connectionStats,
            uptime: Date.now() - this.connectionStats.lastReset,
            errorRate: this.connectionStats.totalRequests > 0 ? ((this.connectionStats.errors / this.connectionStats.totalRequests) * 100).toFixed(2) + "%" : "0%",
        };
    }

    /**
     * Clean up idle connections
     */
    cleanupIdleConnections() {
        try {
            const now = Date.now();
            const httpSockets = this.httpAgent.sockets || {};
            const httpsSockets = this.httpsAgent.sockets || {};

            let cleanedCount = 0;

            // Clean up idle HTTP connections
            Object.values(httpSockets).forEach((socketArray) => {
                if (Array.isArray(socketArray)) {
                    socketArray.forEach((socket) => {
                        if (socket._idleTimeout && now - socket._idleStart > this.connectionConfig.freeSocketTimeout) {
                            socket.destroy();
                            cleanedCount++;
                        }
                    });
                }
            });

            // Clean up idle HTTPS connections
            Object.values(httpsSockets).forEach((socketArray) => {
                if (Array.isArray(socketArray)) {
                    socketArray.forEach((socket) => {
                        if (socket._idleTimeout && now - socket._idleStart > this.connectionConfig.freeSocketTimeout) {
                            socket.destroy();
                            cleanedCount++;
                        }
                    });
                }
            });

            if (cleanedCount > 0) {
                this.logManager.logDebug(`Cleaned up ${cleanedCount} idle connections`);
            }
        } catch (error) {
            this.logManager.logError("Error cleaning up idle connections:", error);
        }
    }

    async makeRequest({ method, endpoint, data = null, additionalHeaders = {}, timeout = 10000 }) {
        const baseUrl = this.config.client.use_cloud ? this.config.client.app_url_cloud : this.config.client.app_url_local;
        const failures = this.retryConfig.failures.get(endpoint) || 0;

        // Increment request counter
        this.connectionStats.totalRequests++;

        if (failures >= this.retryConfig.failureThreshold) {
            if (Date.now() - (this.retryConfig.failures.get(`${endpoint}_time`) || 0) < this.retryConfig.resetTimeout) {
                this.connectionStats.errors++;
                throw new Error(`Too many failures for endpoint: ${endpoint}`);
            }
            this.retryConfig.failures.delete(endpoint);
            this.retryConfig.failures.delete(`${endpoint}_time`);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const startTime = Date.now();

                const response = await this.axiosInstance({
                    method,
                    url: `${baseUrl}${this.config.client.app_id}/${endpoint}`,
                    params: { access_token: this.config.client.access_token },
                    headers: {
                        "Content-Type": "application/json",
                        isLocal: !this.config.client.use_cloud,
                        Connection: "keep-alive", // Explicitly request keep-alive
                        ...additionalHeaders,
                    },
                    data,
                    timeout,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);
                this.retryConfig.failures.delete(endpoint);

                const responseTime = Date.now() - startTime;
                if (responseTime > 5000) {
                    this.logManager.logWarn(`Slow request to ${endpoint}: ${responseTime}ms`);
                }

                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                this.connectionStats.errors++;

                if (error.name === "AbortError" || error.code === "ECONNABORTED") {
                    error.message = `Request timeout after ${timeout}ms`;
                }

                if (this.isNonRetryableError(error) || attempt === this.retryConfig.maxRetries) {
                    this.retryConfig.failures.set(endpoint, failures + 1);
                    this.retryConfig.failures.set(`${endpoint}_time`, Date.now());
                    throw error;
                }

                // Exponential backoff with jitter
                const backoffDelay = Math.min(this.retryConfig.baseDelay * Math.pow(2, attempt), this.retryConfig.maxDelay);
                const jitter = Math.random() * 100;
                await new Promise((resolve) => setTimeout(resolve, backoffDelay + jitter));
            }
        }
    }

    isNonRetryableError(error) {
        return error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429;
    }

    async getDevices() {
        try {
            const response = await this.makeRequest({
                method: "get",
                endpoint: "devices",
                timeout: 10000,
            });
            return response.data;
        } catch (error) {
            this.handleError("getDevices", error);
            return undefined;
        }
    }

    async updatePluginStatus() {
        try {
            const versionCheck = await this.versionManager.checkVersion();
            this.logManager.logBrightBlue(`Sending Plugin Status to Hubitat | Version: [${versionCheck.hasUpdate && versionCheck.newVersion ? "New Version: " + versionCheck.newVersion : "Up-to-date"}]`);

            const metrics = this.getHealthMetrics();
            const response = await this.makeRequest({
                method: "post",
                endpoint: "pluginStatus",
                data: {
                    hasUpdate: versionCheck.hasUpdate,
                    newVersion: versionCheck.newVersion,
                    version: pluginVersion,
                    isLocal: this.config.client.use_cloud ? "false" : "true",
                    accCount: this.getAllCachedAccessories().length || null,
                    memory: metrics.memory,
                    uptime: metrics.uptime,
                },
                timeout: 10000,
            });

            if (response.data) {
                this.logManager.logDebug(`updatePluginStatus Resp: ${JSON.stringify(response.data)}`);
                return response.data;
            }
            return null;
        } catch (error) {
            this.handleError("updatePluginStatus", error);
            return undefined;
        }
    }

    async registerForDirectUpdates() {
        try {
            this.logManager.logInfo(`Registering Plugin for Updates with Hubitat Endpoint | UsingCloud: (${this.config.client.use_cloud === true})`);

            const ip = this.configManager.getActiveIP();
            const port = this.configManager.getActivePort();
            const metrics = this.getHealthMetrics();

            const response = await this.makeRequest({
                method: "post",
                endpoint: "registerPluginForUpdates",
                data: {
                    pluginIp: ip,
                    pluginPort: port,
                    pluginVersion: pluginVersion,
                    memory: metrics.memory,
                    uptime: metrics.uptime,
                },
                timeout: 10000,
            });

            if (response.data) {
                this.logManager.logDebug(`registerForDirectUpdates Resp: ${JSON.stringify(response.data)}`);
                return response.data;
            }
            return null;
        } catch (error) {
            this.handleError("registerForDirectUpdates", error);
            return undefined;
        }
    }

    dispose() {
        // Clear command batching timers
        if (this.commandState.batchTimer) {
            clearTimeout(this.commandState.batchTimer);
        }
        if (this.attributeBatchTimer) {
            clearTimeout(this.attributeBatchTimer);
        }
        for (const timer of this.commandState.timers.values()) {
            clearTimeout(timer);
        }

        // Clear connection monitoring
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }

        // Clean up state
        this.commandState.queue = [];
        this.commandState.timers.clear();
        this.commandState.lastExecutions.clear();
        this.attributeUpdateQueue.clear();
        this.appEvts.removeAllListeners();

        // Log final connection stats
        const finalStats = this.getConnectionStats();
        this.logManager.logInfo(`Final connection stats - Requests: ${finalStats.totalRequests}, Errors: ${finalStats.errors}, Error rate: ${finalStats.errorRate}`);

        // Destroy connection agents
        if (this.httpAgent) {
            this.httpAgent.destroy();
        }
        if (this.httpsAgent) {
            this.httpsAgent.destroy();
        }

        // Clean up axios instance
        if (this.axiosInstance.defaults.httpAgent) {
            this.axiosInstance.defaults.httpAgent.destroy();
        }
        if (this.axiosInstance.defaults.httpsAgent) {
            this.axiosInstance.defaults.httpsAgent.destroy();
        }

        this.logManager.logDebug("HubitatClient disposed");
    }
}
