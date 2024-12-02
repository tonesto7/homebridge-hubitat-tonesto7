// devices/AirPurifier.js
export class AirPurifier {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;
        this.generateSrvcName = platform.generateSrvcName;
    }

    static relevantAttributes = ["switch", "fanMode", "tamper"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Air Purifier for ${accessory.displayName}`);
        const svcName = this.generateSrvcName(accessory.displayName, "Air Purifier");
        const svc = accessory.getOrAddService(this.Service.AirPurifier);
        svc.setCharacteristic(this.Characteristic.Name, svcName);
        const devData = accessory.context.deviceData;

        this._configureActive(accessory, svc, devData);
        this._configureCurrentAirPurifierState(accessory, svc, devData);
        this._configureFanOscillationMode(accessory, svc, devData);

        return accessory;
    }

    _configureActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Active, {
            getHandler: () => {
                return this._getActiveState(devData.attributes.switch);
            },
            setHandler: (value) => {
                accessory.sendCommand(value ? "on" : "off");
            },
        });
    }

    _configureCurrentAirPurifierState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentAirPurifierState, {
            getHandler: () => {
                return this._getAirPurifierState(devData.attributes.switch);
            },
        });
    }

    _configureFanOscillationMode(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.CommunityTypes.FanOscillationMode, {
            getHandler: () => {
                return this._getFanOscillationMode(devData.attributes.fanMode);
            },
            setHandler: (value) => {
                const cmd = this._getFanOscillationModeCmd(value);
                accessory.sendCommand("setFanMode", cmd);
            },
        });
    }

    _getActiveState(value) {
        return value === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
    }

    _getAirPurifierState(value) {
        return value === "on" ? this.Characteristic.CurrentAirPurifierState.PURIFYING_AIR : this.Characteristic.CurrentAirPurifierState.INACTIVE;
    }

    _getFanOscillationMode(value) {
        switch (value) {
            case "low":
                return this.CommunityTypes.FanOscillationMode.LOW;
            case "medium":
                return this.CommunityTypes.FanOscillationMode.MEDIUM;
            case "high":
                return this.CommunityTypes.FanOscillationMode.HIGH;
            default:
                return this.CommunityTypes.FanOscillationMode.SLEEP;
        }
    }

    _getFanOscillationModeCmd(value) {
        switch (value) {
            case this.CommunityTypes.FanOscillationMode.LOW:
                return "low";
            case this.CommunityTypes.FanOscillationMode.MEDIUM:
                return "medium";
            case this.CommunityTypes.FanOscillationMode.HIGH:
                return "high";
            default:
                return "sleep";
        }
    }

    // Handle attribute updates
    async handleAttributeUpdate(accessory, update) {
        const { attribute, value } = update;
        this.logManager.logDebug(`AirPurifier | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!AirPurifier.relevantAttributes.includes(attribute)) return;

        const svc = accessory.getService(this.Service.AirPurifier);
        if (!svc) {
            this.logManager.logWarn(`AirPurifier | ${accessory.displayName} | No service found`);
            return;
        }

        switch (attribute) {
            case "switch":
                svc.getCharacteristic(this.Characteristic.Active).updateValue(this._getActiveState(value));
                break;
            case "fanMode":
                svc.getCharacteristic(this.CommunityTypes.FanOscillationMode).updateValue(this._getFanOscillationMode(value));
                break;
        }
    }
}
