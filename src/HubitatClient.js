// HubitatClient.js

import { platformName, platformDesc, pluginVersion } from "./StaticConfig.js";
import axios from "axios";

export default class HubitatClient {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.versionManager = platform.versionManager;
        this.configManager = platform.configManager;
        this.appEvts = platform.appEvts;

        // Get initial config
        this.config = this.configManager.getConfig();

        // Store a reference to the accessories object
        this._accessories = null;
        // Client state
        this.clientState = {
            localErrorCount: 0,
            localDisabled: false,
            logSocketClients: [],
            eventSocketClients: [],
            communicationBreakCommand: "off",
            hubIp: null,
        };

        // Subscribe to configuration updates
        this.configManager.onConfigUpdate(this.handleConfigUpdate.bind(this));

        // Register event listeners
        this.registerEventListeners();

        // Add retry configuration
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000, // 1 second
            maxDelay: 10000, // 10 seconds
            // Track consecutive failures per endpoint
            failureCounts: new Map(),
            // Circuit breaker thresholds
            failureThreshold: 5,
            resetTimeout: 60000, // 1 minute
            circuitBreakers: new Map(),
        };
    }

    setAccessories(accessories) {
        this._accessories = accessories;
    }

    handleConfigUpdate(newConfig) {
        this.config = newConfig;
    }

    registerEventListeners() {
        this.appEvts.on("event:device_command", this.handleDeviceCommand.bind(this));
        this.appEvts.on("event:plugin_upd_status", this.handleUpdateStatus.bind(this));
        this.appEvts.on("event:plugin_start_direct", this.handleStartDirect.bind(this));
    }

    async handleDeviceCommand(devData, cmd, vals) {
        await this.sendHubitatCommand(devData, cmd, vals);
    }

    async handleUpdateStatus() {
        await this.sendUpdateStatus();
    }

    async handleStartDirect() {
        await this.sendStartDirect();
    }

    updateGlobals(hubIp, useCloud = false) {
        this.logManager.logNotice(`Updating Global Values | HubIP: ${hubIp} | UsingCloud: ${useCloud}`);
        this.clientState.hubIp = hubIp;
        this.config.use_cloud = useCloud === true;
    }

    isNonRetryableError(error) {
        // Don't retry client errors (except 429 Too Many Requests)
        return error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429;
    }

    isCircuitBroken(endpoint) {
        const breaker = this.retryConfig.circuitBreakers.get(endpoint);
        if (!breaker) return false;

        if (Date.now() - breaker.tripTime >= this.retryConfig.resetTimeout) {
            // Reset circuit breaker after timeout
            this.retryConfig.circuitBreakers.delete(endpoint);
            this.retryConfig.failureCounts.set(endpoint, 0);
            return false;
        }

        return true;
    }

    tripCircuitBreaker(endpoint) {
        this.retryConfig.circuitBreakers.set(endpoint, {
            tripTime: Date.now(),
        });

        this.logManager.logError(`Circuit breaker tripped for endpoint ${endpoint}. ` + `Will retry after ${this.retryConfig.resetTimeout / 1000} seconds`);
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

    async sendHubitatCommand(devData, cmd, params = []) {
        console.log("sendHubitatCommand", cmd, params);
        try {
            this.logManager.logNotice(`Sending Device Command: ${cmd}${params.length ? ` | Params: ${JSON.stringify(params)}` : ""} | ` + `Name: (${devData.name}) | DeviceID: (${devData.deviceid})`);

            await this.makeRequest({
                method: "post",
                endpoint: "deviceCmd",
                data: {
                    deviceId: devData.deviceid,
                    command: cmd,
                    params: params,
                },
                additionalHeaders: {
                    evtsource: `Homebridge_${platformName}_${this.config.app_id}`,
                    evttype: "hkCommand",
                },
                timeout: 5000,
            });

            return true;
        } catch (error) {
            this.handleError("sendHubitatCommand", error);
            return false;
        }
    }

    async sendUpdateStatus() {
        try {
            const versionCheck = await this.versionManager.checkVersion();
            this.logManager.logNotice(`Sending Plugin Status to Hubitat | Version: [${versionCheck.hasUpdate && versionCheck.newVersion ? "New Version: " + versionCheck.newVersion : "Up-to-date"}]`);

            const response = await this.makeRequest({
                method: "post",
                endpoint: "pluginStatus",
                data: {
                    hasUpdate: versionCheck.hasUpdate,
                    newVersion: versionCheck.newVersion,
                    version: pluginVersion,
                    isLocal: this.config.use_cloud ? "false" : "true",
                    accCount: this._accessories.getAllAccessories().length || null,
                },
                timeout: 10000,
            });

            if (response.data) {
                this.logManager.logDebug(`sendUpdateStatus Resp: ${JSON.stringify(response.data)}`);
                return response.data;
            }
            return null;
        } catch (error) {
            this.handleError("sendUpdateStatus", error);
            return undefined;
        }
    }

    async sendStartDirect() {
        try {
            this.logManager.logInfo(`Sending StartDirect Request to ${platformDesc} | UsingCloud: (${this.config.use_cloud === true})`);

            const response = await this.makeRequest({
                method: "post",
                endpoint: `startDirect/${this.config.direct_ip}/${this.config.direct_port}/${pluginVersion}`,
                data: {
                    ip: this.config.direct_ip,
                    port: this.config.direct_port,
                    version: pluginVersion,
                },
                timeout: 10000,
            });

            if (response.data) {
                this.logManager.logDebug(`sendStartDirect Resp: ${JSON.stringify(response.data)}`);
                return response.data;
            }
            return null;
        } catch (error) {
            this.handleError("sendStartDirect", error);
            return undefined;
        }
    }

    // Helper method to centralize request creation
    async makeRequest({ method, endpoint, data = null, additionalHeaders = {}, timeout = 10000 }) {
        const baseUrl = this.config.use_cloud ? this.config.app_url_cloud : this.config.app_url_local;

        // Check circuit breaker
        if (this.isCircuitBroken(endpoint)) {
            throw new Error(`Circuit breaker open for endpoint: ${endpoint}`);
        }

        const headers = {
            "Content-Type": "application/json",
            isLocal: this.config.use_cloud ? "false" : "true",
            ...additionalHeaders,
        };

        let lastError;
        let retryCount = 0;

        while (retryCount <= this.retryConfig.maxRetries) {
            try {
                const response = await axios({
                    method,
                    url: `${baseUrl}${this.config.app_id}/${endpoint}`,
                    params: { access_token: this.config.access_token },
                    headers,
                    data,
                    timeout,
                });

                // Reset failure count on success
                this.retryConfig.failureCounts.set(endpoint, 0);
                return response;
            } catch (error) {
                lastError = error;

                // Don't retry certain errors
                if (this.isNonRetryableError(error)) {
                    this.handleError(endpoint, error);
                    throw error;
                }

                // Increment failure count
                const failures = (this.retryConfig.failureCounts.get(endpoint) || 0) + 1;
                this.retryConfig.failureCounts.set(endpoint, failures);

                // Check if we should trip circuit breaker
                if (failures >= this.retryConfig.failureThreshold) {
                    this.tripCircuitBreaker(endpoint);
                    throw new Error(`Circuit breaker tripped for endpoint: ${endpoint}`);
                }

                if (retryCount === this.retryConfig.maxRetries) {
                    this.handleError(endpoint, error);
                    throw error;
                }

                // Calculate delay with exponential backoff and jitter
                const delay = Math.min(this.retryConfig.baseDelay * Math.pow(2, retryCount) + Math.random() * 1000, this.retryConfig.maxDelay);

                this.logManager.logDebug(`Request failed, retrying in ${Math.round(delay)}ms (attempt ${retryCount + 1}/${this.retryConfig.maxRetries})`);

                await new Promise((resolve) => setTimeout(resolve, delay));
                retryCount++;
            }
        }

        throw lastError;
    }
}
