// Client.js

import { platformName, platformDesc, pluginVersion } from "./Constants.js";
import axios from "axios";

export default class Client {
    constructor(platform) {
        this.platform = platform;
        this.log = platform.log;
        this.hubIp = platform.local_hub_ip;
        this.configItems = platform.getConfigItems();
        this.localErrCnt = 0;
        this.localDisabled = false;
        this.clientsLogSocket = [];
        this.clientsEventSocket = [];
        this.communciationBreakCommand = "off";
        this.registerEvtListeners();
    }

    registerEvtListeners = () => {
        this.platform.appEvts.on("event:device_command", async (devData, cmd, vals) => {
            await this.sendDeviceCommand(devData, cmd, vals);
        });
        this.platform.appEvts.on("event:plugin_upd_status", async () => {
            await this.sendUpdateStatus();
        });
        this.platform.appEvts.on("event:plugin_start_direct", async () => {
            await this.sendStartDirect();
        });
    };

    updateGlobals = (hubIp, use_cloud = false) => {
        this.platform.logNotice(`Updating Global Values | HubIP: ${hubIp} | UsingCloud: ${use_cloud}`);
        this.hubIp = hubIp;
        this.configItems.use_cloud = use_cloud === true;
    };

    handleError = (src, err) => {
        switch (err.status) {
            case 401:
                this.platform.logError(`${src} Error | Hubitat Token Error: ${err.response} | Message: ${err.message}`);
                break;
            case 403:
                this.platform.logError(`${src} Error | Hubitat Authentication Error: ${err.response} | Message: ${err.message}`);
                break;
            default:
                if (err.message.startsWith("getaddrinfo EAI_AGAIN")) {
                    this.platform.logError(`${src} Error | Possible Internet/Network/DNS Error | Unable to reach the uri | Message ${err.message}`);
                } else {
                    this.platform.logError(`${src} ${err.response && err.response.defined !== undefined ? err.response : "Connection failure"} | Message: ${err.message}`);
                }
                break;
        }
        if (this.platform.logConfig.debug === true) {
            this.platform.logDebug(`${src} ${JSON.stringify(err)}`);
        }
    };

    getDevices = async () => {
        try {
            const response = await axios({
                method: "get",
                url: `${this.configItems.use_cloud ? this.configItems.app_url_cloud : this.configItems.app_url_local}${this.configItems.app_id}/devices`,
                params: {
                    access_token: this.configItems.access_token,
                },
                headers: {
                    "Content-Type": "application/json",
                    isLocal: this.configItems.use_cloud ? "false" : "true",
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
        try {
            this.platform.logNotice(`Sending Device Command: ${cmd}${vals ? " | Value: " + JSON.stringify(vals) : ""} | Name: (${devData.name}) | DeviceID: (${devData.deviceid}) | UsingCloud: (${this.configItems.use_cloud === true})`);
            const response = await axios({
                method: "post",
                url: `${this.configItems.use_cloud ? this.configItems.app_url_cloud : this.configItems.app_url_local}${this.configItems.app_id}/${devData.deviceid}/command/${cmd}`,
                params: {
                    access_token: this.configItems.access_token,
                },
                headers: {
                    "Content-Type": "application/json",
                    evtsource: `Homebridge_${platformName}_${this.configItems.app_id}`,
                    evttype: "hkCommand",
                    isLocal: this.configItems.use_cloud ? "false" : "true",
                },
                data: vals || null,
                timeout: 5000,
            });
            this.platform.logDebug(`sendDeviceCommand | Response: ${JSON.stringify(response.data)}`);
            return true;
        } catch (err) {
            this.handleError("sendDeviceCommand", err);
            return false;
        }
    };

    sendUpdateStatus = async () => {
        try {
            const res = await this.platform.Utils.checkVersion();
            this.platform.logNotice(`Sending Plugin Status to Hubitat | UpdateAvailable: ${res.hasUpdate}${res.newVersion ? " | newVersion: " + res.newVersion : ""}`);
            const response = await axios({
                method: "post",
                url: `${this.configItems.use_cloud ? this.configItems.app_url_cloud : this.configItems.app_url_local}${this.configItems.app_id}/pluginStatus`,
                params: {
                    access_token: this.configItems.access_token,
                },
                headers: {
                    "Content-Type": "application/json",
                },
                data: {
                    hasUpdate: res.hasUpdate,
                    newVersion: res.newVersion,
                    version: pluginVersion,
                    isLocal: this.configItems.use_cloud ? "false" : "true",
                    accCount: Object.keys(this.platform.deviceTypes.getAllAccessoriesFromCache()).length || null,
                },
                timeout: 10000,
            });
            if (response.data) {
                this.platform.logDebug(`sendUpdateStatus Resp: ${JSON.stringify(response.data)}`);
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
            this.platform.logInfo(`Sending StartDirect Request to ${platformDesc} | UsingCloud: (${this.configItems.use_cloud === true})`);
            const response = await axios({
                method: "post",
                url: `${this.configItems.use_cloud ? this.configItems.app_url_cloud : this.configItems.app_url_local}${this.configItems.app_id}/startDirect/${this.configItems.direct_ip}/${this.configItems.direct_port}/${pluginVersion}`,
                params: {
                    access_token: this.configItems.access_token,
                },
                headers: {
                    "Content-Type": "application/json",
                    isLocal: this.configItems.use_cloud ? "false" : "true",
                },
                data: {
                    ip: this.configItems.direct_ip,
                    port: this.configItems.direct_port,
                    version: pluginVersion,
                },
                timeout: 10000,
            });
            if (response.data) {
                this.platform.logDebug(`sendStartDirect Resp: ${JSON.stringify(response.data)}`);
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
