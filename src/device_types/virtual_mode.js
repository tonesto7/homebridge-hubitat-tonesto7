// device_types/virtual_mode.js

export function isSupported(accessory) {
    return accessory.hasCapability("Mode");
}

export const relevantAttributes = ["switch"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    // const service = accessory.getService(Service.Switch) || accessory.addService(Service.Switch, "Virtual Mode", "VirtualMode");
    const service = deviceClass.getOrAddService(accessory, Service.Switch);

    // Add the service to keep
    deviceClass.addServiceToKeep(accessory, service);

    function setMode(value) {
        if (value && accessory.context.deviceData.attributes.switch === "off") {
            accessory.log.info(`${accessory.name} | Activating Virtual Mode`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, "mode");
        }
    }

    // On/Off Characteristic
    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.On, {
        getHandler: function () {
            const isOn = accessory.context.deviceData.attributes.switch === "on";
            accessory.log.debug(`${accessory.name} | Virtual Mode State Retrieved: ${isOn ? "ON" : "OFF"}`);
            return isOn;
        },
        setHandler: function (value) {
            setMode(value);
        },
    });

    accessory.context.deviceGroups.push("virtual_mode");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.Switch);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Virtual Mode service not found`);
        return;
    }

    if (change.attribute === "switch") {
        const isOn = change.value === "on";
        deviceClass.updateCharacteristicValue(accessory, service, Characteristic.On, isOn);
        // accessory.log.debug(`${accessory.name} | Updated Virtual Mode State: ${isOn ? "ON" : "OFF"}`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}
