// device_types/power_meter.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export async function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("Power Meter") && !accessory.hasCapability("Switch");
}

export const relevantAttributes = ["power"];

export async function initializeService(accessory) {
    const serviceName = `${accessory.context.deviceData.deviceid}_PowerMeter`;
    const powerSvc = accessory.getServiceByName(Service.Switch, serviceName) || accessory.addService(Service.Switch, serviceName, "Power Meter");

    // Add the service to keep
    DeviceClass.addServiceToKeep(accessory, powerSvc);

    // Watts Characteristic
    if (CommunityTypes && CommunityTypes.Watts) {
        DeviceClass.getOrAddCharacteristic(accessory, powerSvc, CommunityTypes.Watts, {
            getHandler: function () {
                let power = parseFloat(accessory.context.deviceData.attributes.power);
                power = DeviceClass.clamp(power, 0, 100000);
                accessory.log.debug(`${accessory.name} | Power Consumption Retrieved: ${power} Watts`);
                return typeof power === "number" ? Math.round(power) : 0;
            },
        });
    } else {
        accessory.log.warn(`${accessory.name} | CommunityTypes.Watts not defined. Skipping Watts characteristic.`);
    }

    accessory.context.deviceGroups.push("power_meter");
}

export async function handleAttributeUpdate(accessory, change) {
    const serviceName = `${accessory.context.deviceData.deviceid}_PowerMeter`;
    const powerSvc = accessory.getServiceByName(Service.Switch, serviceName);

    if (!powerSvc) {
        accessory.log.warn(`${accessory.name} | Power Meter service not found`);
        return;
    }

    if (change.attribute === "power" && CommunityTypes && CommunityTypes.Watts) {
        const power = DeviceClass.clamp(parseFloat(change.value), 0, 100000);
        DeviceClass.updateCharacteristicValue(accessory, powerSvc, CommunityTypes.Watts, Math.round(power));
        // accessory.log.debug(`${accessory.name} | Updated Power Consumption: ${power} Watts`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}
