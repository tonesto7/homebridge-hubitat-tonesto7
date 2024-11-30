// devices/AirPurifier.js
export class AirPurifier {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this.CommunityTypes = platform.CommunityTypes;
    }

    configure(accessory) {
        this.logManager.logDebug(`Configuring Air Purifier for ${accessory.displayName}`);
        const svc = accessory.getOrAddService(this.Service.AirPurifier);
        const devData = accessory.context.deviceData;

        this._configureActive(accessory, svc, devData);
        this._configureCurrentAirPurifierState(accessory, svc, devData);
        this._configureFanOscillationMode(accessory, svc, devData);

        accessory.context.deviceGroups.push("air_purifier");
        return accessory;
    }

    _configureActive(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.Active, {
            getHandler: () => {
                return devData.attributes.switch === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
            },
            setHandler: (value) => {
                accessory.sendCommand(value ? "on" : "off");
            },
            updateHandler: (value) => {
                return value === "on" ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
            },
            storeAttribute: "switch",
        });
    }

    _configureCurrentAirPurifierState(accessory, svc, devData) {
        accessory.getOrAddCharacteristic(svc, this.Characteristic.CurrentAirPurifierState, {
            getHandler: () => {
                return devData.attributes.switch === "on" ? this.Characteristic.CurrentAirPurifierState.PURIFYING_AIR : this.Characteristic.CurrentAirPurifierState.INACTIVE;
            },
            updateHandler: (value) => {
                return value === "on" ? this.Characteristic.CurrentAirPurifierState.PURIFYING_AIR : this.Characteristic.CurrentAirPurifierState.INACTIVE;
            },
            storeAttribute: "switch",
        });
    }

    _configureFanOscillationMode(accessory, svc, devData) {
        const modeMappings = {
            low: this.CommunityTypes.FanOscillationMode.LOW,
            medium: this.CommunityTypes.FanOscillationMode.MEDIUM,
            high: this.CommunityTypes.FanOscillationMode.HIGH,
            sleep: this.CommunityTypes.FanOscillationMode.SLEEP,
        };

        accessory.getOrAddCharacteristic(svc, this.CommunityTypes.FanOscillationMode, {
            getHandler: () => {
                const val = devData.attributes.fanMode;
                return modeMappings[val] || this.CommunityTypes.FanOscillationMode.SLEEP;
            },
            setHandler: (value) => {
                const reverseModeMappings = Object.fromEntries(Object.entries(modeMappings).map(([k, v]) => [v, k]));
                accessory.sendCommand("setFanMode", [reverseModeMappings[value]]);
            },
            updateHandler: (value) => {
                return modeMappings[value] || this.CommunityTypes.FanOscillationMode.SLEEP;
            },
            storeAttribute: "fanMode",
        });
    }
}
