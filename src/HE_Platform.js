// HE_Platform.js

import { packageName, pluginName, platformName, platformDesc, pluginVersion } from "./Constants.js";
import { exec } from "child_process";
import os from "os";
import { compare, validate } from "compare-versions";
import events from "events";
import ConfigManager from "./ConfigManager.js";
import HEClient from "./HE_Client.js";
import HEAccessories from "./HE_Accessories.js";
import CommunityTypes from "./libs/CommunityTypes.js";
import express from "express";
import bodyParser from "body-parser";
import chalk from "chalk";
// import fs from "fs";
import _ from "lodash";

const webApp = express();

export default class HE_Platform {
    constructor(log, config, api) {
        this.log = log;
        this.configManager = new ConfigManager(config, api.user);
        this.config = this.configManager.getConfig();

        if (config === undefined || config === null || config.app_url_local === undefined || config.app_url_local === null || config.app_url_cloud === undefined || config.app_url_cloud === null || config.app_id === undefined || config.app_id === null) {
            log(`${platformName} Plugin is not Configured | Skipping...`);
            return;
        }

        // Subscribe to configuration updates
        this.configManager.onConfigUpdate((newConfig) => {
            this.config = newConfig;
        });

        this.homebridge = api;
        this.hap = api.hap;
        this.Service = api.hap.Service;
        this.Characteristic = api.hap.Characteristic;
        this.Categories = api.hap.Categories;
        this.CommunityTypes = CommunityTypes(this.Service, this.Characteristic);
        this.PlatformAccessory = api.platformAccessory;
        this.uuid = api.hap.uuid;

        this.ok2Run = true;
        this.appEvts = new events.EventEmitter();

        this.logInfo(`Homebridge Version: ${this.homebridge.version}`);
        this.logInfo(`Plugin Version: ${pluginVersion}`);

        this.excludedAttributes = this.config.excluded_attributes || [];
        this.excludedCapabilities = this.config.excluded_capabilities || [];

        // console.log("pluginConfig: ", this.loadConfig());
        this.unknownCapabilities = [];
        this.client = new HEClient(this);
        this.HEAccessories = new HEAccessories(this);

        this.homebridge.on("didFinishLaunching", this.didFinishLaunching.bind(this));
        this.appEvts.emit("event:plugin_upd_status");
    }

    /**
     * Sanitize accessory names to ensure they are clean and consistent.
     * Removes unwanted characters and trims spaces.
     * @param {string} name - The original accessory name.
     * @returns {string} - The sanitized accessory name.
     */
    sanitizeName(name) {
        // Remove all characters except alphanumerics, spaces, and apostrophes
        let sanitized = name
            .replace(/[^a-zA-Z0-9 ']/g, "")
            .trim()
            .replace(/^[^a-zA-Z0-9]+/, "") // Remove leading non-alphanumeric characters
            .replace(/[^a-zA-Z0-9]+$/, "") // Remove trailing non-alphanumeric characters
            .replace(/\s{2,}/g, " "); // Replace multiple spaces with a single space

        // If the name becomes empty after sanitization, use a default name
        sanitized = sanitized.length === 0 ? "Unnamed Device" : sanitized;

        // Log if the name was sanitized
        if (name !== sanitized) {
            this.logWarn(`Sanitized Name: "${name}" => "${sanitized}"`);
        }

        return sanitized;
    }

    /**
     * Add or update an accessory's name after sanitizing it.
     * @param {PlatformAccessory} accessory - The accessory to sanitize and update.
     */
    sanitizeAndUpdateAccessoryName(accessory) {
        const originalName = accessory.context.deviceData.name;
        const sanitizedName = this.sanitizeName(originalName);

        if (sanitizedName !== originalName) {
            // Update the name properties
            accessory.name = sanitizedName;
            // accessory.context.name = sanitizedName;

            // Important: Update displayName like this
            // accessory._associatedHAPAccessory.displayName = sanitizedName;

            // Update the AccessoryInformation service
            const accessoryInformation = accessory.getService(this.Service.AccessoryInformation);
            if (accessoryInformation) {
                accessoryInformation.getCharacteristic(this.Characteristic.Name).updateValue(sanitizedName);

                // Verify that the displayName was updated
                const displayName = accessoryInformation.getCharacteristic(this.Characteristic.Name).value;
                if (displayName !== sanitizedName) {
                    this.logWarn(`Failed to update displayName for device ID: ${accessory.deviceid}`);
                } else {
                    this.logInfo(`AccessoryInformation service updated successfully for device ID: ${accessory.deviceid} | Old Name: "${originalName}" | Display Name: "${displayName}"`);
                    this.homebridge.updatePlatformAccessories([accessory]);
                }
            } else {
                this.logWarn(`AccessoryInformation service not found for device ID: ${accessory.deviceid}`);
            }

            // this.logDebug(`Accessory name updated successfully to "${sanitizedName}"`);
        } else {
            // this.logDebug(`No name update needed for accessory "${originalName}"`);
        }
    }

    /**
     * Logs an alert message with yellow color.
     *
     * @param {string} args - The message to be logged.
     */
    logAlert(args) {
        this.log.info(chalk.yellow(args));
    }

    /**
     * Logs the provided arguments in green color.
     *
     * @param {string} args - The message or arguments to log.
     */
    logGreen(args) {
        this.log.info(chalk.green(args));
    }

    /**
     * Logs a notice message with blue bright color.
     *
     * @param {string} args - The message to be logged.
     */
    logNotice(args) {
        this.log.info(chalk.blueBright(args));
    }

    /**
     * Logs a warning message with a specific color and style.
     *
     * @param {string} args - The warning message to be logged.
     */
    logWarn(args) {
        this.log.warn(chalk.hex("#FFA500").bold(args));
    }

    /**
     * Logs an error message with bold red formatting.
     *
     * @param {string} args - The error message to be logged.
     */
    logError(args) {
        this.log.error(chalk.bold.red(args));
    }

    /**
     * Logs an informational message.
     *
     * @param {string} args - The message to log.
     */
    logInfo(args) {
        this.log.info(chalk.white(args));
    }

    /**
     * Logs a debug message if debugging is enabled in the log configuration.
     *
     * @param {string} args - The message to be logged.
     */
    logDebug(args) {
        if (this.config.logConfig.debug === true) this.log.debug(chalk.gray(args));
    }

    didFinishLaunching() {
        this.logInfo(`Fetching ${platformName} Devices. NOTICE: This may take a moment if you have a large number of devices being loaded!`);
        setInterval(this.refreshDevices.bind(this), this.config.polling_seconds * 1000);
        let that = this;
        this.refreshDevices("First Launch")
            .then(() => {
                that.WebServerInit(that)
                    .catch((err) => that.logError("WebServerInit Error: ", err))
                    .then((resp) => {
                        if (resp && resp.status === "OK") this.appEvts.emit("event:plugin_start_direct");
                    });
            })
            .catch((err) => {
                that.logError(`didFinishLaunching | refreshDevices Exception:` + err);
            });
    }

    async refreshDevices(src = undefined) {
        let that = this;
        let starttime = new Date();

        try {
            that.logInfo(`Refreshing All Device Data${src ? " | Source: (" + src + ")" : ""}`);
            const resp = await this.client.getDevices();
            if (!resp || !resp.deviceList || !Array.isArray(resp.deviceList)) {
                throw new Error("Invalid device list received");
            }
            if (resp && resp.location) {
                this.configManager.updateTempUnit(resp.location.temperature_scale);
                if (resp.location.hubIP) {
                    this.configManager.updateConfig({ direct_ip: resp.location.hubIP, use_cloud: resp.location.use_cloud === true });
                }
            }

            // that.logDebug("Received All Device Data");
            const toCreate = this.HEAccessories.diffAdd(resp.deviceList);
            const toUpdate = this.HEAccessories.intersection(resp.deviceList);
            const toRemove = this.HEAccessories.diffRemove(resp.deviceList);
            that.logWarn(`Devices to Remove: (${Object.keys(toRemove).length}) ` + toRemove.map((i) => i.name));
            that.logInfo(`Devices to Update: (${Object.keys(toUpdate).length})`); // + toUpdate.map((i) => i.name));
            that.logGreen(`Devices to Create: (${Object.keys(toCreate).length}) ` + toCreate.map((i) => i.name));

            // Remove devices first
            for (const accessory of toRemove) {
                await this.removeAccessory(accessory);
            }

            // Update existing devices
            for (const device of toUpdate) {
                await this.updateDevice(device);
            }

            // Add new devices
            for (const device of toCreate) {
                await this.addDevice(device);
            }

            this.logAlert(`Total Initialization Time: (${Math.round((new Date() - starttime) / 1000)} seconds)`);
            this.logNotice(`Unknown Capabilities: ${JSON.stringify(this.unknownCapabilities)}`);
            this.logInfo(`${platformDesc} DeviceCache Size: (${Object.keys(this.HEAccessories.getAllAccessoriesFromCache()).length})`);
            if (src !== "First Launch") this.appEvts.emit("event:plugin_upd_status");
            return true;
        } catch (ex) {
            this.logError(`didFinishLaunching | refreshDevices Exception: ${ex.message}`, ex.stack);
            throw ex;
        }
    }

    getNewAccessory(device, UUID) {
        let accessory = new this.PlatformAccessory(device.name, UUID);
        accessory.context.deviceData = device;
        this.HEAccessories.initializeAccessory(accessory);
        this.sanitizeAndUpdateAccessoryName(accessory); // Added name sanitization
        return accessory;
    }

    async addDevice(device) {
        let accessory;
        const new_uuid = this.uuid.generate(`hubitat_v2_${device.deviceid}`);
        device.excludedCapabilities = this.excludedCapabilities[device.deviceid] || [];
        this.logDebug(`Initializing New Device (${device.name} | ${device.deviceid})`);
        accessory = this.getNewAccessory(device, new_uuid);
        this.homebridge.registerPlatformAccessories(pluginName, platformName, [accessory]);
        this.HEAccessories.addAccessoryToCache(accessory);
        this.logInfo(`Added Device: (${accessory.name} | ${accessory.deviceid})`);
    }

    async updateDevice(device) {
        let cachedAccessory = this.HEAccessories.getAccessoryFromCache(device);
        device.excludedCapabilities = this.excludedCapabilities[device.deviceid] || [];
        cachedAccessory.context.deviceData = device;
        this.logDebug(`Loading Existing Device | Name: (${device.name}) | ID: (${device.deviceid})`);
        cachedAccessory = this.HEAccessories.initializeAccessory(cachedAccessory);
        this.sanitizeAndUpdateAccessoryName(cachedAccessory); // Added name sanitization
        this.HEAccessories.addAccessoryToCache(cachedAccessory);
    }

    async removeAccessory(accessory) {
        if (this.HEAccessories.removeAccessoryFromCache(accessory)) {
            this.homebridge.unregisterPlatformAccessories(pluginName, platformName, [accessory]);
            this.logInfo(`Removed: ${accessory.name} (${accessory.deviceid})`);
        }
    }

    configureAccessory(accessory) {
        if (!this.ok2Run) return;
        this.logDebug(`Configure Cached Accessory: ${accessory.displayName}, UUID: ${accessory.UUID}`);
        // let cachedAccessory = this.HEAccessories.initializeAccessory(accessory, true);
        // this.sanitizeAndUpdateAccessoryName(cachedAccessory); // Added name sanitization
        this.HEAccessories.addAccessoryToCache(accessory);
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
                                deviceid: body.change_device,
                                attribute: body.change_attribute,
                                value: body.change_value,
                                data: body.change_data,
                                date: body.change_date,
                            };
                            that.HEAccessories.processDeviceAttributeUpdate(newChange).then((resp) => {
                                if (that.config.logConfig.showChanges) {
                                    this.logInfo(`${chalk.hex("#FFA500")("Device Event")}: (${chalk.blueBright(body.change_name)}) [${chalk.yellow.bold(body.change_attribute ? body.change_attribute.toUpperCase() : "unknown")}] is ${chalk.green(body.change_value)}`);
                                }
                                res.send({
                                    evtSource: `Homebridge_${platformName}_${this.config.app_id}`,
                                    evtType: "attrUpdStatus",
                                    evtDevice: body.change_name,
                                    evtAttr: body.change_attribute,
                                    evtStatus: resp ? "OK" : "Failed",
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

    toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    checkVersion = async () => {
        this.log.info("Checking Package Version for Updates...");
        return new Promise((resolve) => {
            exec(`npm view ${packageName} version`, (error, stdout) => {
                const newVer = stdout && stdout.trim();
                if (newVer && validate(newVer) && compare(stdout.trim(), pluginVersion, ">")) {
                    this.log.warn("---------------------------------------------------------------");
                    this.log.warn(`NOTICE: New version of ${packageName} available: ${newVer}`);
                    this.log.warn("---------------------------------------------------------------");
                    resolve({
                        hasUpdate: true,
                        newVersion: newVer,
                    });
                } else {
                    this.log.info("INFO: Your plugin version is up-to-date");
                    resolve({
                        hasUpdate: false,
                        newVersion: newVer,
                    });
                }
            });
        });
    };
}
