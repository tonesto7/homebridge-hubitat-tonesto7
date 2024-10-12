// device_types/valve.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("Valve");
}

export const relevantAttributes = ["valve"];

export function initializeAccessory(accessory) {
    const valveSvc = DeviceClass.getOrAddService(accessory, Service.Valve);

    DeviceClass.getOrAddCharacteristic(accessory, valveSvc, Characteristic.Active, {
        getHandler: function () {
            const isActive = convertValveState(accessory.context.deviceData.attributes.valve, Characteristic);
            accessory.log.debug(`${accessory.name} | Valve Active State Retrieved: ${isActive}`);
            return isActive;
        },
        setHandler: function (value) {
            const command = value === Characteristic.Active.ACTIVE ? "open" : "close";
            accessory.log.info(`${accessory.name} | Setting valve state via command: ${command}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, valveSvc, Characteristic.InUse, {
        getHandler: function () {
            const inUse = convertInUseState(accessory.context.deviceData.attributes.valve, Characteristic);
            accessory.log.debug(`${accessory.name} | Valve InUse State Retrieved: ${inUse}`);
            return inUse;
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, valveSvc, Characteristic.ValveType, {
        value: Characteristic.ValveType.GENERIC_VALVE,
    });

    accessory.context.deviceGroups.push("valve");
}

export function handleAttributeUpdate(accessory, change) {
    const valveSvc = accessory.getService(Service.Valve);

    if (!valveSvc) {
        accessory.log.warn(`${accessory.name} | Valve service not found`);
        return;
    }

    if (change.attribute === "valve") {
        const isActive = convertValveState(change.value, Characteristic);
        const inUse = convertInUseState(change.value, Characteristic);
        DeviceClass.updateCharacteristicValue(accessory, valveSvc, Characteristic.Active, isActive);
        DeviceClass.updateCharacteristicValue(accessory, valveSvc, Characteristic.InUse, inUse);
        // accessory.log.debug(`${accessory.name} | Updated Valve: Active: ${isActive}, InUse: ${inUse}`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function convertValveState(state) {
    return state === "open" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
}

function convertInUseState(state) {
    return state === "open" ? Characteristic.InUse.IN_USE : Characteristic.InUse.NOT_IN_USE;
}
