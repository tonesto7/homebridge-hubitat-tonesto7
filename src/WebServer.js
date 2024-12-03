// platform/WebServer.js

import { pluginName, platformName, platformDesc } from "./StaticConfig.js";
import express from "express";
import bodyParser from "body-parser";

const webApp = express();

export class WebServer {
    constructor(platform) {
        this.platform = platform;
        this.logManager = platform.logManager;
        this.configManager = platform.configManager;
        this.config = platform.config;
        this.homebridge = platform.homebridge;
        this.accessories = platform.accessories;
        this.appEvts = platform.appEvts;

        // Subscribe to config updates
        this.configManager.onConfigUpdate((newConfig) => {
            this.config = newConfig;
            this.logManager.logDebug("WebServer config updated");
        });
    }

    async initialize() {
        try {
            const ip = this.configManager.getActiveIP();
            const port = await this.configManager.findAvailablePort();
            this.logManager.logInfo("WebServer Initiated...");

            this.configureMiddleware();
            this.setupRoutes();

            // Start the HTTP Server
            webApp.listen(port, () => {
                this.logManager.logInfo(`Direct Connect Active | Listening at ${ip}:${port}`);
            });

            return { status: "OK" };
        } catch (ex) {
            this.logManager.logError("WebServerInit Exception: ", ex.message);
            return { status: ex.message };
        }
    }

    configureMiddleware() {
        webApp.use(bodyParser.urlencoded({ extended: false }));
        webApp.use(bodyParser.json());
        webApp.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
    }

    setupRoutes() {
        this.setupBasicRoutes();
        this.setupDebugRoutes();
        this.setupConfigurationRoutes();
        this.setupDeviceRoutes();
    }

    setupBasicRoutes() {
        webApp.get("/", (req, res) => {
            res.send("WebApp is running...");
        });

        webApp.post("/initial", (req, res) => {
            const body = JSON.parse(JSON.stringify(req.body));
            if (body && this.isValidRequestor(body.access_token, body.app_id, "initial")) {
                this.logManager.logSuccess(`${platformName} Hub Communication Established`);
                res.send({ status: "OK" });
            } else {
                res.send({ status: "Failed: Missing access_token or app_id" });
            }
        });

        webApp.get("/pluginTest", (req, res) => {
            this.logManager.logInfo(`${platformName} Plugin Test Request Received...`);
            res.status(200).send(
                JSON.stringify(
                    {
                        status: "OK",
                        homebridge_version: this.homebridge.version,
                        plugin: {
                            name: pluginName,
                            platform_name: platformName,
                            platform_desc: platformDesc,
                            version: this.platform.versionManager.getVersion(),
                            config: this.configManager.getConfig(),
                        },
                    },
                    null,
                    4,
                ),
            );
        });
    }

    setupDebugRoutes() {
        webApp.get("/debugOpts", (req, res) => {
            this.logManager.logInfo(`${platformName} Debug Option Request(${req.query.option})...`);
            if (req.query?.option) {
                const accs = this.accessories.getAllAccessoriesFromCache();
                switch (req.query.option) {
                    case "allAccData":
                        res.send(JSON.stringify(accs));
                        break;
                    default:
                        res.send(`Error: Invalid Option Parameter Received | Option: ${req.query.option}`);
                        break;
                }
            } else {
                res.send("Error: Missing Valid Debug Query Parameter");
            }
        });
    }

    setupConfigurationRoutes() {
        webApp.post("/restartService", (req, res) => {
            const body = JSON.parse(JSON.stringify(req.body));
            if (body && this.isValidRequestor(body.access_token, body.app_id, "restartService")) {
                const delay = 10 * 1000;
                this.logManager.logInfo(`Received request from ${platformName} to restart homebridge service in ` + `(${delay / 1000} seconds) | NOTICE: If you using PM2 or Systemd the Homebridge Service should start back up`);
                setTimeout(() => {
                    process.exit(1);
                }, parseInt(delay));
                res.send({ status: "OK" });
            } else {
                res.send({ status: "Failed: Missing access_token or app_id" });
            }
        });

        webApp.post("/updateprefs", this.handlePreferencesUpdate.bind(this));
    }

    setupDeviceRoutes() {
        webApp.post("/refreshDevices", this.handleDeviceRefresh.bind(this));
        webApp.post("/update", this.handleDeviceUpdate.bind(this));
    }

    handlePreferencesUpdate(req, res) {
        const body = JSON.parse(JSON.stringify(req.body));
        if (!body || !this.isValidRequestor(body.access_token, body.app_id, "updateprefs")) {
            res.send({ status: "Failed: Missing access_token or app_id" });
            return;
        }

        const preferenceMappings = {
            use_cloud: ["client", "use_cloud"],
            validateTokenId: ["client", "validateTokenId"],
            // local_hub_ip: ["client", "direct_ip"],
            consider_fan_by_name: ["devices", "consider_fan_by_name"],
            consider_light_by_name: ["devices", "consider_light_by_name"],
            adaptive_lighting: ["features", "adaptive_lighting", "enabled"],
            adaptive_lighting_off_when_on: ["features", "adaptive_lighting", "off_when_on"],
        };

        let updates = {};
        for (const [bodyKey, configPath] of Object.entries(preferenceMappings)) {
            if (body[bodyKey] !== undefined) {
                const currentValue = configPath.reduce((obj, key) => obj[key], this.config);
                const newValue = bodyKey.includes("lighting") || bodyKey.includes("by_name") ? body[bodyKey] === true : body[bodyKey];

                if (currentValue !== newValue) {
                    this.logManager.logInfo(`${platformName} Updated ${configPath.join(".")} Preference | ` + `Before: ${currentValue} | Now: ${newValue}`);
                    updates[configPath.join(".")] = newValue;
                }
            }
        }

        if (Object.keys(updates).length > 0) {
            this.configManager.updateConfig(updates);
        }

        res.send({ status: "OK" });
    }

    handleDeviceRefresh(req, res) {
        const body = JSON.parse(JSON.stringify(req.body));
        if (body && this.isValidRequestor(body.access_token, body.app_id, "refreshDevices")) {
            this.logManager.logSuccess(`Received request from ${platformName} to refresh devices`);
            this.platform.refreshDevices("Hubitat App Requested");
            res.send({ status: "OK" });
        } else {
            this.logManager.logError(`Unable to start device refresh because we didn't receive a valid access_token and app_id`);
            res.send({ status: "Failed: Missing access_token or app_id" });
        }
    }

    handleDeviceUpdate(req, res) {
        if (req.body.length < 3) return;
        const body = JSON.parse(JSON.stringify(req.body));
        if (!body || !this.isValidRequestor(body.access_token, body.app_id, "update")) {
            res.send({ status: "Failed: Missing access_token or app_id" });
            return;
        }

        if (Object.keys(body).length > 3) {
            const newChange = {
                name: body.change_name,
                deviceid: body.change_device,
                attribute: body.change_attribute,
                value: body.change_value,
                data: body.change_data,
                date: body.change_date,
            };

            this.accessories.processDeviceAttributeUpdate(newChange).then((success) => {
                res.send({
                    evtSource: `Homebridge_${platformName}_${this.config.client.app_id}`,
                    evtType: "attrUpdStatus",
                    evtDevice: body.change_name,
                    evtAttr: body.change_attribute,
                    evtStatus: success ? "OK" : "Failed",
                });
            });
        } else {
            res.send({
                evtSource: `Homebridge_${platformName}_${this.config.client.app_id}`,
                evtType: "attrUpdStatus",
                evtDevice: body.change_name,
                evtAttr: body.change_attribute,
                evtStatus: "Failed",
            });
        }
    }

    isValidRequestor(access_token, app_id, src) {
        if (this.config.client.validateTokenId !== true) {
            return true;
        }
        if (app_id && access_token && this.config.client.app_id && this.config.client.access_token && access_token === this.config.client.access_token && parseInt(app_id) === parseInt(this.config.client.app_id)) {
            return true;
        }
        this.logManager.logError(`(${src}) | We received a request from a client that didn't provide a valid access_token and app_id`);
        return false;
    }
}
