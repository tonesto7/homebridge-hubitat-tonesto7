// HE_Platform.js

import { packageName, pluginName, platformName, platformDesc, pluginVersion } from "./Constants.js";
import { exec } from "child_process";
import os from "os";
import { compare, validate } from "compare-versions";
import events from "events";
import ConfigManager from "./ConfigManager.js";
import HubitatClient from "./HubitatClient.js";
import HubitatAccessories from "./HubitatAccessories.js";
import CommunityTypes from "./libs/CommunityTypes.js";
import express from "express";
import bodyParser from "body-parser";
import chalk from "chalk";
// import fs from "fs";
import _ from "lodash";

const webApp = express();

export default class HubitatPlatform {
    constructor(log, config, api) {
        this.chalk = chalk;
        this.log = log;
        this.configManager = new ConfigManager(config, api.user);
        this.config = this.configManager.getConfig();

        this.api = api;
        this.homebridge = api;
        this.hap = api.hap;
        this.Service = api.hap.Service;
        this.Characteristic = api.hap.Characteristic;
        this.Categories = api.hap.Categories;
        this.CommunityTypes = CommunityTypes(this.Service, this.Characteristic);
        this.PlatformAccessory = api.platformAccessory;
        this.uuid = api.hap.uuid;

        // Validate config
        if (this.validateConfig(this.config)) {
            log(`${platformName} Plugin is not Configured | Skipping...`);
            return;
        }

        // Platform state
        this.ok2Run = true;
        this.appEvts = new events.EventEmitter();

        // Initialize components
        this.accessories = new HubitatAccessories(this);
        this.client = new HubitatClient(this, this.accessories);
        this.unknownCapabilities = [];

        // Log platform info
        this.logInfo(`Homebridge Version: ${api.version}`);
        this.logInfo(`Plugin Version: ${pluginVersion}`);

        // Configuration subscriptions
        this.configManager.onConfigUpdate((newConfig) => {
            this.config = newConfig;
        });

        // Register platform
        api.on("didFinishLaunching", this.didFinishLaunching.bind(this));
        this.appEvts.emit("event:plugin_upd_status");
    }

    // Platform initialization
    async didFinishLaunching() {
        try {
            this.logInfo(`Fetching ${platformName} Devices. NOTICE: This may take a moment if you have a large number of devices being loaded!`);

            // Setup refresh interval
            setInterval(this.refreshDevices.bind(this), this.config.polling_seconds * 1000);

            // Initial device refresh
            await this.refreshDevices("First Launch");

            // Initialize web server
            const webServerResult = await this.WebServerInit(this);
            if (webServerResult && webServerResult.status === "OK") {
                this.appEvts.emit("event:plugin_start_direct");
            }
        } catch (err) {
            console.error("Platform Initialization Error:", err);
        }
    }

    async refreshDevices(src = undefined) {
        let starttime = new Date();

        try {
            this.logInfo(`Refreshing All Device Data${src ? " | Source: (" + src + ")" : ""}`);

            // Fetch devices from hub
            const resp = await this.client.getDevices();
            if (!resp || !resp.deviceList || !Array.isArray(resp.deviceList)) {
                throw new Error("Invalid device list received");
            }

            // Update location settings if available
            if (resp.location) {
                this.handleLocationUpdate(resp.location);
            }

            // Refresh accessories
            await this.accessories.refreshDevices(resp.deviceList);

            // Log completion
            this.logAlert(`Total Initialization Time: (${Math.round((new Date() - starttime) / 1000)} seconds)`);

            if (src !== "First Launch") {
                this.appEvts.emit("event:plugin_upd_status");
            }

            return true;
        } catch (ex) {
            console.error(`refreshDevices Error:`, ex);
            throw ex;
        }
    }

    handleLocationUpdate(location) {
        if (location.temperature_scale) {
            this.configManager.updateTempUnit(location.temperature_scale);
        }
        if (location.hubIP) {
            this.configManager.updateConfig({
                direct_ip: location.hubIP,
                use_cloud: location.use_cloud === true,
            });
        }
    }

    // Platform accessory management - now delegated to HubitatAccessories
    configureAccessory(accessory) {
        if (!this.ok2Run) return;
        this.accessories.configureAccessory(accessory);
    }

    processIncrementalUpdate(data, that) {
        that.logDebug("new data: " + data);
        if (data && data.attributes && data.attributes instanceof Array) {
            for (let i = 0; i < data.attributes.length; i++) {
                that.processDeviceAttributeUpdate(data.attributes[i], that);
            }
        }
    }

    isValidRequestor(access_token, app_id, src) {
        if (this.config.validateTokenId !== true) {
            return true;
        }
        if (app_id && access_token && this.config.app_id && this.config.access_token && access_token === this.config.access_token && parseInt(app_id) === parseInt(this.config.app_id)) return true;
        this.logError(`(${src}) | We received a request from a client that didn't provide a valid access_token and app_id`);
        return false;
    }

    WebServerInit() {
        let that = this;
        // Get the IP address that we will send to the Hubitat App. This can be overridden in the config file.
        return new Promise((resolve) => {
            try {
                const ip = this.configManager.getConfigValue("direct_ip");
                const port = this.configManager.getConfigValue("direct_port");
                that.logInfo("WebServer Initiated...");

                // Start the HTTP Server
                webApp.listen(port, () => {
                    that.logInfo(`Direct Connect Active | Listening at ${ip}:${port}`);
                });

                webApp.use(
                    bodyParser.urlencoded({
                        extended: false,
                    }),
                );
                webApp.use(bodyParser.json());
                webApp.use((req, res, next) => {
                    res.header("Access-Control-Allow-Origin", "*");
                    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                    next();
                });

                webApp.get("/", (req, res) => {
                    res.send("WebApp is running...");
                });

                webApp.post("/initial", (req, res) => {
                    let body = JSON.parse(JSON.stringify(req.body));
                    if (body && that.isValidRequestor(body.access_token, body.app_id, "initial")) {
                        that.logGreen(`${platformName} Hub Communication Established`);
                        res.send({
                            status: "OK",
                        });
                    } else {
                        res.send({
                            status: "Failed: Missing access_token or app_id",
                        });
                    }
                });

                webApp.get("/debugOpts", (req, res) => {
                    that.logInfo(`${platformName} Debug Option Request(${req.query.option})...`);
                    if (req.query && req.query.option) {
                        let accs = this.HEAccessories.getAllAccessoriesFromCache();
                        // let accsKeys = Object.keys(accs);
                        // console.log(accsKeys);
                        switch (req.query.option) {
                            case "allAccData":
                                res.send(JSON.stringify(accs));
                                break;
                            // case 'accServices':
                            //     var o = accsKeys.forEach(s => s.services.forEach(s1 => s1.UUID));
                            //     res.send(JSON.stringify(o));
                            //     break;
                            // case 'accCharacteristics':
                            //     var o = accsKeys.forEach(s => s.services.forEach(s1 => s1.characteristics.forEach(c => c.displayName)));
                            //     res.send(JSON.stringify(o));
                            //     break;
                            // case 'accContext':
                            //     res.send(JSON.stringify(this.HEAccessories.getAllAccessoriesFromCache()));
                            //     break;
                            default:
                                res.send(`Error: Invalid Option Parameter Received | Option: ${req.query.option}`);
                                break;
                        }
                    } else {
                        res.send("Error: Missing Valid Debug Query Parameter");
                    }
                });

                webApp.get("/pluginTest", (req, res) => {
                    that.logInfo(`${platformName} Plugin Test Request Received...`);
                    res.status(200).send(
                        JSON.stringify(
                            {
                                status: "OK",
                                homebridge_version: this.homebridge.version,
                                plugin: {
                                    name: pluginName,
                                    platform_name: platformName,
                                    platform_desc: platformDesc,
                                    version: pluginVersion,
                                    config: this.configManager.getConfig(),
                                },
                            },
                            null,
                            4,
                        ),
                    );
                });

                webApp.post("/restartService", (req, res) => {
                    let body = JSON.parse(JSON.stringify(req.body));
                    if (body && that.isValidRequestor(body.access_token, body.app_id, "restartService")) {
                        let delay = 10 * 1000;
                        that.logInfo(`Received request from ${platformName} to restart homebridge service in (${delay / 1000} seconds) | NOTICE: If you using PM2 or Systemd the Homebridge Service should start back up`);
                        setTimeout(() => {
                            process.exit(1);
                        }, parseInt(delay));
                        res.send({
                            status: "OK",
                        });
                    } else {
                        res.send({
                            status: "Failed: Missing access_token or app_id",
                        });
                    }
                });

                webApp.post("/refreshDevices", (req, res) => {
                    let body = JSON.parse(JSON.stringify(req.body));
                    if (body && that.isValidRequestor(body.access_token, body.app_id, "refreshDevices")) {
                        that.logGreen(`Received request from ${platformName} to refresh devices`);
                        that.refreshDevices("Hubitat App Requested");
                        res.send({
                            status: "OK",
                        });
                    } else {
                        that.logError(`Unable to start device refresh because we didn't receive a valid access_token and app_id`);
                        res.send({
                            status: "Failed: Missing access_token or app_id",
                        });
                    }
                });

                webApp.post("/updateprefs", (req, res) => {
                    let body = JSON.parse(JSON.stringify(req.body));
                    if (body && that.isValidRequestor(body.access_token, body.app_id, "updateprefs")) {
                        that.logInfo(platformName + " Hub Sent Preference Updates");
                        let sendUpd = false;
                        // if (body && Object.keys(body).length > 0) {
                        //     Object.keys(body).forEach((key) => {});
                        // }
                        if (body.use_cloud && this.config.use_cloud !== body.use_cloud) {
                            this.logInfo(`${platformName} Updated Use Cloud Preference | Before: ${this.config.use_cloud} | Now: ${body.use_cloud}`);
                            this.configManager.updateConfig({ use_cloud: body.use_cloud === true });
                        }
                        if (body.validateTokenId && this.config.validateTokenId !== body.validateTokenId) {
                            this.logInfo(`${platformName} Updated Validate Token & Id Preference | Before: ${this.config.validateTokenId} | Now: ${body.validateTokenId}`);
                            this.configManager.updateConfig({ validateTokenId: body.validateTokenId === true });
                        }
                        if (body.local_hub_ip && this.config.direct_ip !== body.local_hub_ip) {
                            this.logInfo(`${platformName} Updated Hub IP Preference | Before: ${this.config.direct_ip} | Now: ${body.local_hub_ip}`);
                            this.configManager.updateConfig({ direct_ip: body.local_hub_ip });
                        }
                        if (body.consider_fan_by_name && this.config.consider_fan_by_name !== body.consider_fan_by_name) {
                            this.logInfo(`${platformName} Updated Consider Fan By Name Preference | Before: ${this.config.consider_fan_by_name} | Now: ${body.consider_fan_by_name}`);
                            this.configManager.updateConfig({ consider_fan_by_name: body.consider_fan_by_name === true });
                        }
                        if (body.consider_light_by_name && this.config.consider_light_by_name !== body.consider_light_by_name) {
                            this.logInfo(`${platformName} Updated Consider Light By Name Preference | Before: ${this.config.consider_light_by_name} | Now: ${body.consider_light_by_name}`);
                            this.configManager.updateConfig({ consider_light_by_name: body.consider_light_by_name === true });
                        }
                        if (body.adaptive_lighting && this.config.adaptive_lighting !== body.adaptive_lighting) {
                            this.logInfo(`${platformName} Updated Adaptive Lighting Preference | Before: ${this.config.adaptive_lighting} | Now: ${body.adaptive_lighting}`);
                            this.configManager.updateConfig({ adaptive_lighting: body.adaptive_lighting === true });
                        }
                        if (body.adaptive_lighting_off_when_on && this.config.adaptive_lighting_off_when_on !== body.adaptive_lighting_off_when_on) {
                            this.logInfo(`${platformName} Updated Adaptive Lighting Off When On Preference | Before: ${this.config.adaptive_lighting_off_when_on} | Now: ${body.adaptive_lighting_off_when_on}`);
                            this.configManager.updateConfig({ adaptive_lighting_off_when_on: body.adaptive_lighting_off_when_on === true });
                        }
                        res.send({
                            status: "OK",
                        });
                    } else {
                        res.send({
                            status: "Failed: Missing access_token or app_id",
                        });
                    }
                });

                webApp.post("/update", (req, res) => {
                    if (req.body.length < 3) return;
                    let body = JSON.parse(JSON.stringify(req.body));
                    if (body && that.isValidRequestor(body.access_token, body.app_id, "update")) {
                        if (Object.keys(body).length > 3) {
                            let newChange = {
                                name: body.change_name,
                                deviceid: body.change_device,
                                attribute: body.change_attribute,
                                value: body.change_value,
                                data: body.change_data,
                                date: body.change_date,
                            };
                            this.accessories.processDeviceAttributeUpdate(newChange).then((success) => {
                                res.send({
                                    evtSource: `Homebridge_${platformName}_${this.config.app_id}`,
                                    evtType: "attrUpdStatus",
                                    evtDevice: body.change_name,
                                    evtAttr: body.change_attribute,
                                    evtStatus: success ? "OK" : "Failed",
                                });
                            });
                        } else {
                            res.send({
                                evtSource: `Homebridge_${platformName}_${this.config.app_id}`,
                                evtType: "attrUpdStatus",
                                evtDevice: body.change_name,
                                evtAttr: body.change_attribute,
                                evtStatus: "Failed",
                            });
                        }
                    } else {
                        res.send({
                            status: "Failed: Missing access_token or app_id",
                        });
                    }
                });
                resolve({
                    status: "OK",
                });
            } catch (ex) {
                that.logError("WebServerInit Exception: ", ex.message);
                resolve({
                    status: ex.message,
                });
            }
        });
    }

    // Logging methods
    logAlert(args) {
        this.log.info(chalk.yellow(args));
    }

    logGreen(args) {
        this.log.info(chalk.green(args));
    }

    logNotice(args) {
        this.log.info(chalk.blueBright(args));
    }

    logWarn(args) {
        this.log.warn(chalk.hex("#FFA500").bold(args));
    }

    logError(msg, err) {
        this.log.error(chalk.bold.red(msg));
        if (err) this.log.error(err);
    }

    logInfo(args) {
        this.log.info(chalk.white(args));
    }

    logDebug(args) {
        if (this.config.logConfig.debug === true) this.log.debug(chalk.gray(args));
    }

    // Utility methods
    validateConfig(config) {
        return config === undefined || config === null || config.app_url_local === undefined || config.app_url_local === null || config.app_url_cloud === undefined || config.app_url_cloud === null || config.app_id === undefined || config.app_id === null;
    }

    sanitizeName(name) {
        let sanitized = name
            .replace(/[^a-zA-Z0-9 ']/g, "")
            .trim()
            .replace(/^[^a-zA-Z0-9]+/, "")
            .replace(/[^a-zA-Z0-9]+$/, "")
            .replace(/\s{2,}/g, " ");

        sanitized = sanitized.length === 0 ? "Unnamed Device" : sanitized;

        if (name !== sanitized) {
            this.logWarn(`Sanitized Name: "${name}" => "${sanitized}"`);
        }

        return sanitized;
    }

    toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    // Version checking
    async checkVersion() {
        this.logInfo("Checking Package Version for Updates...");
        return new Promise((resolve) => {
            exec(`npm view ${packageName} version`, (error, stdout) => {
                const newVer = stdout && stdout.trim();
                if (newVer && validate(newVer) && compare(stdout.trim(), pluginVersion, ">")) {
                    this.logWarn("---------------------------------------------------------------");
                    this.logWarn(`NOTICE: New version of ${packageName} available: ${newVer}`);
                    this.logWarn("---------------------------------------------------------------");
                    resolve({ hasUpdate: true, newVersion: newVer });
                } else {
                    this.logInfo("INFO: Your plugin version is up-to-date");
                    resolve({ hasUpdate: false, newVersion: newVer });
                }
            });
        });
    }
}
