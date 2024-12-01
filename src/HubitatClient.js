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

    handleError(source, error) {
        const errorMap = {
            401: "Hubitat Token Error",
            403: "Hubitat Authentication Error",
        };

        if (error.status && errorMap[error.status]) {
            this.logManager.logError(`${source} Error | ${errorMap[error.status]}: ${error.response} | Message: ${error.message}`);
        } else if (error.message?.startsWith("getaddrinfo EAI_AGAIN")) {
            this.logManager.logError(`${source} Error | Possible Internet/Network/DNS Error | Unable to reach the uri | Message ${error.message}`);
        } else {
            this.logManager.logError(`${source} ${error.response?.defined !== undefined ? error.response : "Connection failure"} | Message: ${error.message}`);
        }

        this.logManager.logDebug(`${source} ${JSON.stringify(error)}`);
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

        const headers = {
            "Content-Type": "application/json",
            isLocal: this.config.use_cloud ? "false" : "true",
            ...additionalHeaders,
        };

        return await axios({
            method,
            url: `${baseUrl}${this.config.app_id}/${endpoint}`,
            params: { access_token: this.config.access_token },
            headers,
            data,
            timeout,
        });
    }
}
