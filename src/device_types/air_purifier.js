// device_types/air_purifier.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("AirPurifier");
}

export const relevantAttributes = ["switch", "fanMode", "tamper"];

export function initializeAccessory(accessory) {
    // Ensure CommunityTypes.NewAirPurifierService exists
    if (!CommunityTypes || !CommunityTypes.NewAirPurifierService) {
        accessory.log.warn(`${accessory.name} | CommunityTypes.NewAirPurifierService is not defined.`);
        return;
    }

    const airPurifierSvc = DeviceClass.getOrAddService(accessory, CommunityTypes.NewAirPurifierService);

    DeviceClass.getOrAddCharacteristic(accessory, airPurifierSvc, Characteristic.Active, {
        getHandler: function () {
            const isActive = accessory.context.deviceData.attributes.switch === "on";
            accessory.log.debug(`${accessory.name} | Active State Retrieved: ${isActive ? "ACTIVE" : "INACTIVE"}`);
            return isActive ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
        },
        setHandler: function () {
            const command = value === Characteristic.Active.ACTIVE ? "on" : "off";
            accessory.log.info(`${accessory.name} | Setting Air Purifier Active State via command: ${command}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
        },
    });

    // Current Air Purifier State Characteristic
    DeviceClass.getOrAddCharacteristic(accessory, airPurifierSvc, Characteristic.CurrentAirPurifierState, {
        getHandler: function () {
            const state = accessory.context.deviceData.attributes.switch === "on" ? "purifying" : "inactive";
            const currentState = convertAirPurifierState(state);
            accessory.log.debug(`${accessory.name} | Current Air Purifier State Retrieved: ${currentState}`);
            return currentState;
        },
        setHandler: function () {
            accessory.log.warn(`${accessory.name} | Attempted to set CurrentAirPurifierState characteristic, which is read-only.`);
        },
    });

    // Fan Oscillation Mode Characteristic
    if (CommunityTypes && CommunityTypes.FanOscilationMode) {
        DeviceClass.getOrAddCharacteristic(accessory, airPurifierSvc, CommunityTypes.FanOscilationMode, {
            getHandler: function () {
                const fanMode = accessory.context.deviceData.attributes.fanMode || "sleep";
                const convertedMode = convertFanMode(fanMode);
                accessory.log.debug(`${accessory.name} | Fan Oscillation Mode Retrieved: ${convertedMode}`);
                return convertedMode;
            },
            setHandler: function () {
                const mode = convertFanModeToDevice(value);
                accessory.log.info(`${accessory.name} | Setting Fan Oscillation Mode to: ${mode}`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, "setFanMode", { value1: mode });
            },
        });
    } else {
        accessory.log.warn(`${accessory.name} | CommunityTypes.FanOscilationMode is not defined.`);
    }

    DeviceClass.getOrAddCharacteristic(accessory, airPurifierSvc, Characteristic.StatusTampered, {
        preReqChk: (acc) => acc.hasCapability("TamperAlert"),
        getHandler: function () {
            const isTampered = accessory.context.deviceData.attributes.tamper === "detected";
            accessory.log.debug(`${accessory.name} | Status Tampered Retrieved: ${isTampered}`);
            return isTampered;
        },
        removeIfMissingPreReq: true,
    });

    accessory.context.deviceGroups.push("air_purifier");
}

export function andleAttributeUpdate(accessory, change) {
    const airPurifierSvc = accessory.getService(CommunityTypes.NewAirPurifierService);
    if (!airPurifierSvc) {
        accessory.log.warn(`${accessory.name} | Air Purifier service not found`);
        return;
    }

    switch (change.attribute) {
        case "switch":
            const isActive = change.value === "on";
            DeviceClass.updateCharacteristicValue(accessory, airPurifierSvc, Characteristic.Active, isActive ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE);
            DeviceClass.updateCharacteristicValue(accessory, airPurifierSvc, Characteristic.CurrentAirPurifierState, isActive ? Characteristic.CurrentAirPurifierState.PURIFYING_AIR : Characteristic.CurrentAirPurifierState.INACTIVE);
            // accessory.log.debug(`${accessory.name} | Updated Active: ${isActive} and CurrentAirPurifierState: ${isActive ? "PURIFYING_AIR" : "INACTIVE"}`);
            break;
        case "fanMode":
            if (CommunityTypes && CommunityTypes.FanOscilationMode) {
                DeviceClass.updateCharacteristicValue(accessory, airPurifierSvc, CommunityTypes.FanOscilationMode, convertFanMode(change.value));
            }
            break;
        case "tamper":
            if (accessory.hasCapability("TamperAlert")) {
                DeviceClass.updateCharacteristicValue(accessory, airPurifierSvc, Characteristic.StatusTampered, change.value === "detected");
            }
            break;
        default:
            accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function convertFanMode(mode) {
    switch (mode) {
        case "low":
            return CommunityTypes.FanOscilationMode.LOW;
        case "medium":
            return CommunityTypes.FanOscilationMode.MEDIUM;
        case "high":
            return CommunityTypes.FanOscilationMode.HIGH;
        case "sleep":
            return CommunityTypes.FanOscilationMode.SLEEP;
        default:
            accessory.log.warn(`${accessory.name} | Unsupported fan mode: ${mode}`);
            return CommunityTypes.FanOscilationMode.SLEEP; // Default mode
    }
}

function convertFanModeToDevice(mode) {
    switch (mode) {
        case CommunityTypes.FanOscilationMode.LOW:
            return "low";
        case CommunityTypes.FanOscilationMode.MEDIUM:
            return "medium";
        case CommunityTypes.FanOscilationMode.HIGH:
            return "high";
        case CommunityTypes.FanOscilationMode.SLEEP:
        default:
            return "sleep";
    }
}

function convertAirPurifierState(state) {
    accessory.log.debug(`${accessory.name} | Air Purifier State: ${state}`);
    switch (state) {
        case "purifying":
            return Characteristic.CurrentAirPurifierState.PURIFYING_AIR;
        case "idle":
            return Characteristic.CurrentAirPurifierState.IDLE;
        case "inactive":
        default:
            return Characteristic.CurrentAirPurifierState.INACTIVE;
    }
}
