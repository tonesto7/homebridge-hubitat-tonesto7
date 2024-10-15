// device_types/switch_device.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export async function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("Switch") && !(accessory.hasCapability("LightBulb") || accessory.hasCapability("Outlet") || accessory.hasCapability("Bulb") || (accessory.platform.configItems.consider_light_by_name === true && accessory.context.deviceData.name.toLowerCase().includes("light")) || accessory.hasCapability("Button"));
}

export const relevantAttributes = ["switch"];

export async function initializeService(accessory) {
    const switchSvc = DeviceClass.getOrAddService(accessory, Service.Switch);

    DeviceClass.getOrAddCharacteristic(accessory, switchSvc, Characteristic.On, {
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

export async function handleAttributeUpdate(accessory, change) {
    const switchSvc = accessory.getService(Service.Switch);
    if (!switchSvc) {
        accessory.log.warn(`${accessory.name} | Switch service not found`);
        return;
    }

    if (change.attribute === "switch") {
        const isOn = change.value === "on";
        DeviceClass.updateCharacteristicValue(accessory, switchSvc, Characteristic.On, isOn);
        // accessory.log.debug(`${accessory.name} | Updated Switch State: ${isOn ? "ON" : "OFF"}`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}
