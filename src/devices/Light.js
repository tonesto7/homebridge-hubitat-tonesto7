// devices/Light.js
export class Light {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.config = platform.config;
        this.api = platform.api;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["switch", "level", "hue", "saturation", "colorTemperature", "color", "effectName", "lightEffects"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Light for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.Lightbulb, accessory.displayName, "light");
        const devData = accessory.context.deviceData;

        this._configureOnOff(accessory, svc, devData);
        this._configureBrightness(accessory, svc, devData);
        this._configureColor(accessory, svc, devData);
        this._configureColorTemperature(accessory, svc, devData);
        this._configureAdaptiveLighting(accessory, svc);

        // Configure effects if supported
        if (accessory.hasAttribute("lightEffects") && accessory.hasCommand("setEffect") && this.config.features.led_effects.enabled) {
            this._configureEffects(accessory, devData);
        }

        return accessory;
    }

    _configureOnOff(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
            getHandler: () => this._getOnState(devData.attributes.switch),
            setHandler: (value) => accessory.sendCommand(value ? "on" : "off"),
        });
    }

    _configureBrightness(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Brightness, {
            preReqChk: () => accessory.hasAttribute("level") && accessory.hasCommand("setLevel"),
            getHandler: () => this._transformBrightnessFromDevice(devData.attributes.level),
            setHandler: (value) => accessory.sendCommand("setLevel", [this._transformBrightnessToDevice(value)]),
            props: { minStep: 1, minValue: 0, maxValue: 100 },
            removeIfMissingPreReq: true,
        });
    }

    _configureColor(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Hue, {
            preReqChk: () => accessory.hasAttribute("hue") && accessory.hasCommand("setHue"),
            getHandler: () => this._transformHueFromDevice(devData.attributes.hue),
            setHandler: (value) => accessory.sendCommand("setHue", [this._transformHueToDevice(value)]),
            props: { minValue: 0, maxValue: 360 },
            removeIfMissingPreReq: true,
        });

        accessory.getOrAddCharacteristic(svc, this.Characteristic.Saturation, {
            preReqChk: () => accessory.hasAttribute("saturation") && accessory.hasCommand("setSaturation"),
            getHandler: () => devData.attributes.saturation,
            setHandler: (value) => accessory.sendCommand("setSaturation", [value]),
            props: { minValue: 0, maxValue: 100 },
            removeIfMissingPreReq: true,
        });
    }

    _configureColorTemperature(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.ColorTemperature, {
            preReqChk: () => accessory.hasAttribute("colorTemperature") && accessory.hasCommand("setColorTemperature"),
            getHandler: () => this._kelvinToMired(devData.attributes.colorTemperature),
            setHandler: (value) => accessory.sendCommand("setColorTemperature", [this._miredToKelvin(value)]),
            props: { minValue: 140, maxValue: 500 },
            removeIfMissingPreReq: true,
        });
    }

    // Adaptive Lighting Functions
    _configureAdaptiveLighting = (accessory, svc) => {
        const canUseAL = accessory.hasAttribute("level") && accessory.hasAttribute("colorTemperature") && this.config.features.adaptive_lighting.enabled !== false && !accessory.hasDeviceFlag("light_no_al");

        if (canUseAL && !this._getAdaptiveLightingController(accessory)) {
            const offset = this.config.features.adaptive_lighting.offset || 0;
            const controlMode = this.api.hap.AdaptiveLightingControllerMode.AUTOMATIC;
            if (svc) {
                accessory.adaptiveLightingController = new this.api.hap.AdaptiveLightingController(svc, { controllerMode: controlMode, customTemperatureAdjustment: offset });
                accessory.adaptiveLightingController.on("update", (evt) => {
                    this.logManager.logDebug(`[${accessory.context.deviceData.name}] Adaptive Lighting Controller Update Event: `, evt);
                });
                accessory.adaptiveLightingController.on("disable", (evt) => {
                    this.logManager.logDebug(`${accessory.displayName} | Adaptive Lighting Controller Disabled Event: `, evt);
                });
                accessory.configureController(accessory.adaptiveLightingController);
                this.logManager.logInfo(`Adaptive Lighting Supported | Assigning Adaptive Lighting Controller to ${accessory.displayName}`);
            } else {
                this.logManager.logError(`${accessory.displayName} | Unable to add adaptiveLightingController because the required service parameter was missing...`);
            }
        } else if (!canUseAL && this._getAdaptiveLightingController(accessory)) {
            this._removeAdaptiveLightingController(accessory);
        }
    };

    _removeAdaptiveLightingController = (accessory) => {
        if (accessory.adaptiveLightingController) {
            this.logManager.logInfo(`Adaptive Lighting Not Supported | Removing Adaptive Lighting Controller from ${accessory.displayName}!!!`);
            accessory.removeController(accessory.adaptiveLightingController);
            delete accessory["adaptiveLightingController"];
        }
    };

    _getAdaptiveLightingController = (accessory) => {
        return accessory.adaptiveLightingController || undefined;
    };

    _isAdaptiveLightingActive = (accessory) => {
        return accessory.adaptiveLightingController ? accessory.adaptiveLightingController.isAdaptiveLightingActive() : false;
    };

    _pauseAdaptiveLighting = (accessory, manualControl = false) => {
        const offWhenOn = this.config.features.adaptive_lighting.off_when_on || false;
        const hasController = accessory.adaptiveLightingController ? true : false;
        const isActive = this._isAdaptiveLightingActive(accessory);

        if (hasController && isActive && manualControl && offWhenOn) {
            this._disableAdaptiveLighting(accessory);
            this.logManager.logInfo(`${accessory.displayName} | Adaptive Lighting disabled due to manual control`);
        }
    };

    // _getAdaptiveLightingData = (accessory) => {
    //     if (accessory.adaptiveLightingController) {
    //         return {
    //             isActive: accessory.adaptiveLightingController.disableAdaptiveLighting(),
    //             brightnessMultiplierRange: accessory.adaptiveLightingController.getAdaptiveLightingBrightnessMultiplierRange(),
    //             notifyIntervalThreshold: accessory.adaptiveLightingController.getAdaptiveLightingNotifyIntervalThreshold(),
    //             startTimeOfTransition: accessory.adaptiveLightingController.getAdaptiveLightingStartTimeOfTransition(),
    //             timeOffset: accessory.adaptiveLightingController.getAdaptiveLightingTimeOffset(),
    //             transitionCurve: accessory.adaptiveLightingController.getAdaptiveLightingTransitionCurve(),
    //             updateInterval: accessory.adaptiveLightingController.getAdaptiveLightingUpdateInterval(),
    //             transitionPoint: accessory.adaptiveLightingController.getCurrentAdaptiveLightingTransitionPoint(),
    //         };
    //     }
    //     return undefined;
    // };

    _disableAdaptiveLighting = (accessory) => {
        if (accessory.adaptiveLightingController) {
            accessory.adaptiveLightingController.disableAdaptiveLighting();
        }
    };

    _configureEffects(accessory, devData) {
        const televisionService = accessory.getOrAddService(this.Service.Television, accessory.displayName + " Effects");

        // Basic TV characteristics
        accessory.getOrAddCharacteristic(televisionService, this.Characteristic.SleepDiscoveryMode, {
            getHandler: () => this.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE,
        });

        accessory.getOrAddCharacteristic(televisionService, this.Characteristic.ConfiguredName, {
            getHandler: () => `${accessory.displayName} Effects`,
        });

        // Active state
        accessory.getOrAddCharacteristic(televisionService, this.Characteristic.Active, {
            getHandler: () => {
                const effectState = this._getCurrentEffect(accessory);
                return effectState.isActive ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
            },
            setHandler: async (value) => {
                if (value === this.Characteristic.Active.INACTIVE) {
                    await accessory.sendCommand("setEffect", [0]);
                } else {
                    const effectState = this._getCurrentEffect(accessory);
                    const firstEffect = Object.keys(effectState.effects)[0];
                    if (firstEffect) {
                        await accessory.sendCommand("setEffect", [parseInt(firstEffect)]);
                    }
                }
            },
        });

        // Effect Selection
        accessory.getOrAddCharacteristic(televisionService, this.Characteristic.ActiveIdentifier, {
            getHandler: () => {
                const effectState = this._getCurrentEffect(accessory);
                const effectNumber = Object.entries(effectState.effects).find(([_, name]) => name === effectState.name)?.[0];
                return effectNumber ? parseInt(effectNumber) : 0;
            },
            setHandler: (value) => accessory.sendCommand("setEffect", [value]),
        });

        // Required Remote Key characteristic
        accessory.getOrAddCharacteristic(televisionService, this.Characteristic.RemoteKey);

        // Set up initial effects
        this._updateEffects(accessory, televisionService);

        // Handle lightEffects attribute updates to rebuild input sources when effects change
        accessory.getOrAddCharacteristic(televisionService, this.Characteristic.Name, {
            getHandler: () => `${accessory.displayName} Effects`,
        });
    }

    _updateEffects(accessory, televisionService) {
        const effectState = this._getCurrentEffect(accessory);

        // Remove old input sources
        const oldInputServices = accessory.services.filter((service) => service.UUID === this.Service.InputSource.UUID);
        for (const service of oldInputServices) {
            televisionService.removeLinkedService(service);
            accessory.removeService(service);
        }

        // Add new input sources for each effect
        for (const [effectNumber, effectName] of Object.entries(effectState.effects)) {
            const inputService = accessory.getOrAddService(this.Service.InputSource, effectName, `effect${effectNumber}`);

            this._configureInputSource(accessory, inputService, effectNumber, effectName);
            televisionService.addLinkedService(inputService);
        }
    }

    _configureInputSource(accessory, inputService, effectNumber, effectName) {
        const characteristics = [
            { char: this.Characteristic.Identifier, value: parseInt(effectNumber) },
            { char: this.Characteristic.ConfiguredName, value: effectName },
            { char: this.Characteristic.IsConfigured, value: this.Characteristic.IsConfigured.CONFIGURED },
            { char: this.Characteristic.InputSourceType, value: this.Characteristic.InputSourceType.APPLICATION },
            { char: this.Characteristic.CurrentVisibilityState, value: this.Characteristic.CurrentVisibilityState.SHOWN },
            { char: this.Characteristic.Name, value: effectName },
        ];

        for (const { char, value } of characteristics) {
            accessory.getOrAddCharacteristic(inputService, char, {
                getHandler: () => value,
            });
        }
    }

    // Helper Methods
    _getCurrentEffect(accessory) {
        const attributes = accessory.context.deviceData.attributes;
        return {
            name: attributes.effectName,
            isActive: attributes.effectName !== undefined && attributes.effectName !== "None",
            effects: JSON.parse(attributes.lightEffects || "{}"),
        };
    }

    _getOnState(value) {
        return value === "on";
    }

    _transformBrightnessFromDevice(value) {
        if (this.config.devices.round_levels) {
            if (value < 5) return 0;
            if (value > 95) return 100;
        }
        return Math.max(0, Math.min(100, parseInt(value)));
    }

    _transformBrightnessToDevice(value) {
        return Math.max(0, Math.min(100, parseInt(value)));
    }

    _transformHueFromDevice(value) {
        return Math.max(0, Math.min(360, Math.round(value * 3.6)));
    }

    _transformHueToDevice(value) {
        return Math.round(value / 3.6);
    }

    _kelvinToMired(kelvin) {
        return Math.max(140, Math.min(500, Math.round(1000000 / kelvin)));
    }

    _miredToKelvin(mired) {
        return Math.round(1000000 / mired);
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`Light | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!Light.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.Lightbulb, this.generateSrvcName(accessory.displayName, "Light"));
        if (!svc) return;

        switch (attribute) {
            case "switch":
                svc.getCharacteristic(this.Characteristic.On).updateValue(this._getOnState(value));
                break;
            case "level":
                svc.getCharacteristic(this.Characteristic.Brightness).updateValue(this._transformBrightnessFromDevice(value));
                break;
            case "hue":
                svc.getCharacteristic(this.Characteristic.Hue).updateValue(this._transformHueFromDevice(value));
                break;
            case "saturation":
                svc.getCharacteristic(this.Characteristic.Saturation).updateValue(value);
                break;
            case "colorTemperature":
                svc.getCharacteristic(this.Characteristic.ColorTemperature).updateValue(this._kelvinToMired(value));
                break;
            case "color":
                svc.getCharacteristic(this.Characteristic.Color).updateValue(value);
                break;
            case "effectName":
                this._updateEffects(accessory, svc);
                break;
            case "lightEffects":
                this._updateEffects(accessory, svc);
                break;
            default:
                this.logManager.logWarn(`Light | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}
