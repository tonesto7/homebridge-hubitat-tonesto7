// device_types/outlet.js

export function isSupported(accessory) {
    return accessory.hasCapability("Outlet") && accessory.hasCapability("Switch");
}

export const relevantAttributes = ["switch"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.Outlet);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.On, {
        getHandler: function () {
            const isOn = accessory.context.deviceData.attributes.switch === "on";
            accessory.log.debug(`${accessory.name} | Outlet State Retrieved: ${isOn ? "ON" : "OFF"}`);
            return isOn;
        },
        setHandler: function (value) {
            const command = value ? "on" : "off";
            accessory.log.info(`${accessory.name} | Setting outlet state to ${command}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
        },
    });

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.OutletInUse, {
        getHandler: function () {
            const inUse = accessory.context.deviceData.attributes.switch === "on";
            accessory.log.debug(`${accessory.name} | Outlet In Use Retrieved: ${inUse}`);
            return inUse;
        },
    });

    accessory.context.deviceGroups.push("outlet");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.Outlet);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Outlet service not found`);
        return;
    }

    if (change.attribute === "switch") {
        const isOn = change.value === "on";
        deviceClass.updateCharacteristicValue(accessory, service, Characteristic.On, isOn);
        deviceClass.updateCharacteristicValue(accessory, service, Characteristic.OutletInUse, isOn);
        // accessory.log.debug(`${accessory.name} | Updated Outlet State: ${isOn ? "ON" : "OFF"}`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}
