// device_types/switch_device.js

export function isSupported(accessory) {
    return accessory.hasCapability("Switch") && !(accessory.hasCapability("LightBulb") || accessory.hasCapability("Outlet") || accessory.hasCapability("Bulb") || (accessory.platform.configItems.consider_light_by_name === true && accessory.context.deviceData.name.toLowerCase().includes("light")) || accessory.hasCapability("Button"));
}

export const relevantAttributes = ["switch"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const service = deviceClass.getOrAddService(accessory, Service.Switch);

    deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.On, {
        getHandler: function () {
            const isOn = accessory.context.deviceData.attributes.switch === "on";
            accessory.log.debug(`${accessory.name} | Switch State Retrieved: ${isOn ? "ON" : "OFF"}`);
            return isOn;
        },
        setHandler: function (value) {
            const command = value ? "on" : "off";
            accessory.log.info(`${accessory.name} | Setting switch state to ${command}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
        },
    });

    accessory.context.deviceGroups.push("switch");
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    const service = accessory.getService(Service.Switch);

    if (!service) {
        accessory.log.warn(`${accessory.name} | Switch service not found`);
        return;
    }

    if (change.attribute === "switch") {
        const isOn = change.value === "on";
        deviceClass.updateCharacteristicValue(accessory, service, Characteristic.On, isOn);
        // accessory.log.debug(`${accessory.name} | Updated Switch State: ${isOn ? "ON" : "OFF"}`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}
