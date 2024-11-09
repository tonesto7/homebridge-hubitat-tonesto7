// HE_Client.js

import { platformName, platformDesc, pluginVersion } from "./Constants.js";
import axios from "axios";

export default class HEClient {
    constructor(platform) {
        this.platform = platform;
        this.log = platform.log;

        this.config = this.platform.configManager.getConfig();

        // Subscribe to configuration updates
        this.platform.configManager.onConfigUpdate((newConfig) => {
            // console.log("Client Config Update:", newConfig);
            this.config = newConfig;
        });

        this.localErrCnt = 0;
        this.localDisabled = false;
        this.clientsLogSocket = [];
        this.clientsEventSocket = [];
        this.communciationBreakCommand = "off";
        this.registerEvtListeners();
    }

    registerEvtListeners() {
        this.platform.appEvts.on("event:device_command", async (devData, cmd, vals) => {
            await this.sendDeviceCommand(devData, cmd, vals);
        });
        this.platform.appEvts.on("event:plugin_upd_status", async () => {
            await this.sendUpdateStatus();
        });
        this.platform.appEvts.on("event:plugin_start_direct", async () => {
            await this.sendStartDirect();
        });
    }

    updateGlobals(hubIp, use_cloud = false) {
        this.logNotice(`Updating Global Values | HubIP: ${hubIp} | UsingCloud: ${use_cloud}`);
        this.hubIp = hubIp;
        this.config.use_cloud = use_cloud === true;
    }

    /**
     * Handles errors by logging appropriate messages based on the error status.
     *
     * @param {string} src - The source of the error.
     * @param {Object} err - The error object.
     * @param {number} err.status - The HTTP status code of the error.
     * @param {string} err.message - The error message.
     * @param {Object} [err.response] - The response object associated with the error.
     */
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

        this.platform.logDebug(`${src} ${JSON.stringify(err)}`);
    };

    /**
     * Fetches the list of devices from the configured URL.
     *
     * This function makes an asynchronous HTTP GET request to retrieve device data.
     * The URL is determined based on whether the cloud or local configuration is used.
     *
     * @async
     * @function getDevices
     * @returns {Promise<Object|undefined>} A promise that resolves to the device data, or undefined if an error occurs.
     * @throws Will handle and log errors internally using the handleError method.
     */
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

    /**
     * Sends a command to a specified device.
     *
     * @async
     * @param {Object} devData - The device data.
     * @param {string} devData.name - The name of the device.
     * @param {string} devData.deviceid - The ID of the device.
     * @param {string} cmd - The command to send to the device.
     * @param {Object} [vals] - Optional values to send with the command.
     * @returns {Promise<boolean>} - Returns true if the command was sent successfully, otherwise false.
     */
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
            this.platform.logDebug(`sendDeviceCommand | Response: ${JSON.stringify(response.data)}`);
            return true;
        } catch (err) {
            this.handleError("sendDeviceCommand", err);
            return false;
        }
    };

    /**
     * Sends the plugin status to Hubitat.
     *
     * This function checks the current version of the plugin and sends the status to Hubitat,
     * indicating whether there is an update available and other relevant information.
     *
     * @async
     * @function sendUpdateStatus
     * @returns {Promise<Object|null|undefined>} The response data from the server if available,
     *                                           null if no data is returned, or undefined if an error occurs.
     * @throws Will handle and log any errors that occur during the process.
     */
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
                    accCount: Array.from(this.platform.HEAccessories.getAllAccessoriesFromCache().values()).length || null,
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

    /**
     * Sends a StartDirect request to the configured URL.
     *
     * This function constructs a POST request to either the cloud or local URL based on the configuration.
     * It includes necessary parameters and headers, and handles the response or any errors that occur.
     *
     * @async
     * @function sendStartDirect
     * @returns {Promise<Object|null|undefined>} The response data if successful, null if no data, or undefined if an error occurs.
     * @throws Will handle and log any errors that occur during the request.
     */
    sendStartDirect = async () => {
        try {
            this.platform.logInfo(`Sending StartDirect Request to ${platformDesc} | UsingCloud: (${this.config.use_cloud === true})`);
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
