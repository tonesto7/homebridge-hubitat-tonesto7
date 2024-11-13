// HubitatClient.js

import { platformName, platformDesc, pluginVersion } from "./Constants.js";
import axios from "axios";

export default class HubitatClient {
    constructor(platform) {
        this.platform = platform;
        this.log = platform.log;
        this.logDebug = platform.logDebug;

        this.configManager = platform.configManager;
        this.appEvts = platform.appEvts;

        this.config = this.configManager.getConfig();

        this.localErrCnt = 0;
        this.localDisabled = false;
        this.clientsLogSocket = [];
        this.clientsEventSocket = [];
        this.communciationBreakCommand = "off";

        // Subscribe to configuration updates
        this.configManager.onConfigUpdate((newConfig) => {
            this.config = newConfig;
        });

        this.registerEvtListeners();
    }

    registerEvtListeners() {
        this.appEvts.on("event:device_command", async (devData, cmd, vals) => {
            await this.sendDeviceCommand(devData, cmd, vals);
        });
        this.appEvts.on("event:plugin_upd_status", async () => {
            await this.sendUpdateStatus();
        });
        this.appEvts.on("event:plugin_start_direct", async () => {
            await this.sendStartDirect();
        });
    }

    updateGlobals(hubIp, use_cloud = false) {
        this.logNotice(`Updating Global Values | HubIP: ${hubIp} | UsingCloud: ${use_cloud}`);
        this.hubIp = hubIp;
        this.config.use_cloud = use_cloud === true;
    }

    handleError = (src, err) => {
        switch (err.status) {
            case 401:
                this.log.error(`${src} Error | Hubitat Token Error: ${err.response} | Message: ${err.message}`);
                break;
            case 403:
                this.log.error(`${src} Error | Hubitat Authentication Error: ${err.response} | Message: ${err.message}`);
                break;
            default:
                if (err.message.startsWith("getaddrinfo EAI_AGAIN")) {
                    this.log.error(`${src} Error | Possible Internet/Network/DNS Error | Unable to reach the uri | Message ${err.message}`);
                } else {
                    this.log.error(`${src} ${err.response && err.response.defined !== undefined ? err.response : "Connection failure"} | Message: ${err.message}`);
                }
                break;
        }

        this.log.debug(`${src} ${JSON.stringify(err)}`);
    };

    getDevices = async () => {
        try {
            const response = await axios({
                method: "get",
                url: `${this.config.use_cloud ? this.config.app_url_cloud : this.config.app_url_local}${this.config.app_id}/devices`,
                params: {
                    access_token: this.config.access_token,
                },
                headers: {
                    "Content-Type": "application/json",
                    isLocal: this.config.use_cloud ? "false" : "true",
                },
                timeout: 10000,
            });
            return response.data;
        } catch (err) {
            this.handleError("getDevices", err);
            return undefined;
        }
    };

    sendDeviceCommand = async (devData, cmd, vals) => {
        // console.log("sendDeviceCommand", devData, cmd, vals);
        try {
            this.platform.logNotice(`Sending Device Command: ${cmd}${vals ? " | Value: " + JSON.stringify(vals) : ""} | Name: (${devData.name}) | DeviceID: (${devData.deviceid})${this.config.use_cloud === true ? " | UsingCloud: (true)" : ""}`);
            const response = await axios({
                method: "post",
                url: `${this.config.use_cloud ? this.config.app_url_cloud : this.config.app_url_local}${this.config.app_id}/${devData.deviceid}/command/${cmd}`,
                params: {
                    access_token: this.config.access_token,
                },
                headers: {
                    "Content-Type": "application/json",
                    evtsource: `Homebridge_${platformName}_${this.config.app_id}`,
                    evttype: "hkCommand",
                    isLocal: this.config.use_cloud ? "false" : "true",
                },
                data: vals || null,
                timeout: 5000,
            });
            this.log.debug(`sendDeviceCommand | Response: ${JSON.stringify(response.data)}`);
            return true;
        } catch (err) {
            this.handleError("sendDeviceCommand", err);
            return false;
        }
    };

    sendUpdateStatus = async () => {
        try {
            const res = await this.platform.checkVersion();
            this.platform.logNotice(`Sending Plugin Status to Hubitat | Version: [${res.hasUpdate && res.newVersion ? "New Version: " + res.newVersion : "Up-to-date"}]`);
            const response = await axios({
                method: "post",
                url: `${this.config.use_cloud ? this.config.app_url_cloud : this.config.app_url_local}${this.config.app_id}/pluginStatus`,
                params: {
                    access_token: this.config.access_token,
                },
                headers: {
                    "Content-Type": "application/json",
                },
                data: {
                    hasUpdate: res.hasUpdate,
                    newVersion: res.newVersion,
                    version: pluginVersion,
                    isLocal: this.config.use_cloud ? "false" : "true",
                    accCount: Array.from(this.platform.accessories.getAllAccessories().values()).length || null,
                },
                timeout: 10000,
            });
            if (response.data) {
                this.log.debug(`sendUpdateStatus Resp: ${JSON.stringify(response.data)}`);
                return response.data;
            } else {
                return null;
            }
        } catch (err) {
            this.handleError("sendUpdateStatus", err);
            return undefined;
        }
    };

    sendStartDirect = async () => {
        try {
            this.log.info(`Sending StartDirect Request to ${platformDesc} | UsingCloud: (${this.config.use_cloud === true})`);
            const response = await axios({
                method: "post",
                url: `${this.config.use_cloud ? this.config.app_url_cloud : this.config.app_url_local}${this.config.app_id}/startDirect/${this.config.direct_ip}/${this.config.direct_port}/${pluginVersion}`,
                params: {
                    access_token: this.config.access_token,
                },
                headers: {
                    "Content-Type": "application/json",
                    isLocal: this.config.use_cloud ? "false" : "true",
                },
                data: {
                    ip: this.config.direct_ip,
                    port: this.config.direct_port,
                    version: pluginVersion,
                },
                timeout: 10000,
            });
            if (response.data) {
                this.log.debug(`sendStartDirect Resp: ${JSON.stringify(response.data)}`);
                return response.data;
            } else {
                return null;
            }
        } catch (err) {
            this.handleError("sendStartDirect", err);
            return undefined;
        }
    };
}
