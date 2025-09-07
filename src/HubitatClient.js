/**
 * @file HubitatClient.js
 * @description Manages communication with the Hubitat hub and handles command batching
 */

import { platformName, platformDesc, pluginVersion } from "./StaticConst.js";
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

        // Configure axios with connection pooling
        this.axiosInstance = axios.create({
            httpAgent: new http.Agent({
                keepAlive: true,
                maxSockets: 10,
                keepAliveMsecs: 1000,
                timeout: 30000,
            }),
            httpsAgent: new https.Agent({
                keepAlive: true,
                maxSockets: 10,
                keepAliveMsecs: 1000,
                timeout: 30000,
            }),
        });

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
        await this.updatePluginStatus();
    }

    async handleRegisterForDirectUpdates() {
        await this.registerForDirectUpdates();
    }

    async processBatch() {
        if (!this.commandState.queue.length) return;

        const commands = this.commandState.queue.splice(0, this.commandState.batchSize);
        this.commandState.batchTimer = null;

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
        } catch (error) {
            this.handleError("processBatch", error);
            // Fall back to individual commands
            for (const cmd of commands) {
                await this.sendSingleCommand(cmd.devData, cmd.command, cmd.params);
            }
        }

        // Process remaining queue if any
        if (this.commandState.queue.length) {
            this.scheduleBatchProcessing();
        }
    }

    async sendSingleCommand(devData, cmd, params) {
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
            return true;
        } catch (error) {
            this.handleError("sendSingleCommand", error);
            return false;
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
    }

    async makeRequest({ method, endpoint, data = null, additionalHeaders = {}, timeout = 10000 }) {
        const baseUrl = this.config.client.use_cloud ? this.config.client.app_url_cloud : this.config.client.app_url_local;
        const failures = this.retryConfig.failures.get(endpoint) || 0;

        if (failures >= this.retryConfig.failureThreshold) {
            if (Date.now() - (this.retryConfig.failures.get(`${endpoint}_time`) || 0) < this.retryConfig.resetTimeout) {
                throw new Error(`Too many failures for endpoint: ${endpoint}`);
            }
            this.retryConfig.failures.delete(endpoint);
            this.retryConfig.failures.delete(`${endpoint}_time`);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const response = await this.axiosInstance({
                    method,
                    url: `${baseUrl}${this.config.client.app_id}/${endpoint}`,
                    params: { access_token: this.config.client.access_token },
                    headers: {
                        "Content-Type": "application/json",
                        isLocal: !this.config.client.use_cloud,
                        ...additionalHeaders,
                    },
                    data,
                    timeout,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);
                this.retryConfig.failures.delete(endpoint);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);

                if (error.name === "AbortError" || error.code === "ECONNABORTED") {
                    error.message = `Request timeout after ${timeout}ms`;
                }

                if (this.isNonRetryableError(error) || attempt === this.retryConfig.maxRetries) {
                    this.retryConfig.failures.set(endpoint, failures + 1);
                    this.retryConfig.failures.set(`${endpoint}_time`, Date.now());
                    throw error;
                }

                await new Promise((resolve) => setTimeout(resolve, Math.min(this.retryConfig.baseDelay * Math.pow(2, attempt), this.retryConfig.maxDelay)));
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
        if (this.commandState.batchTimer) {
            clearTimeout(this.commandState.batchTimer);
        }
        if (this.attributeBatchTimer) {
            clearTimeout(this.attributeBatchTimer);
        }
        for (const timer of this.commandState.timers.values()) {
            clearTimeout(timer);
        }
        this.commandState.queue = [];
        this.commandState.timers.clear();
        this.commandState.lastExecutions.clear();
        this.attributeUpdateQueue.clear();
        this.appEvts.removeAllListeners();

        // Destroy axios agents
        if (this.axiosInstance.defaults.httpAgent) {
            this.axiosInstance.defaults.httpAgent.destroy();
        }
        if (this.axiosInstance.defaults.httpsAgent) {
            this.axiosInstance.defaults.httpsAgent.destroy();
        }

        this.logManager.logDebug("HubitatClient disposed");
    }
}
