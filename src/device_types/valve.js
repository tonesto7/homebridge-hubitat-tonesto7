// device_types/valve.js

export function isSupported(accessory) {
    return accessory.hasCapability("Valve");
}

export const relevantAttributes = ["valve"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.Valve);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.Active, {
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

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.InUse, {
        getHandler: function () {
            const inUse = convertInUseState(accessory.context.deviceData.attributes.valve, Characteristic);
            accessory.log.debug(`${accessory.name} | Valve InUse State Retrieved: ${inUse}`);
            return inUse;
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.ValveType, {
        value: Characteristic.ValveType.GENERIC_VALVE,
    });

    accessory.context.deviceGroups.push("valve");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.Valve);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Valve service not found`);
        return;
    }

    if (change.attribute === "valve") {
        const isActive = convertValveState(change.value, Characteristic);
        const inUse = convertInUseState(change.value, Characteristic);

        deviceClass.updateCharacteristicValue(accessory, service, Characteristic.Active, isActive);
        deviceClass.updateCharacteristicValue(accessory, service, Characteristic.InUse, inUse);

        // accessory.log.debug(`${accessory.name} | Updated Valve: Active: ${isActive}, InUse: ${inUse}`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function convertValveState(state, Characteristic) {
    return state === "open" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
}

function convertInUseState(state, Characteristic) {
    return state === "open" ? Characteristic.InUse.IN_USE : Characteristic.InUse.NOT_IN_USE;
}
