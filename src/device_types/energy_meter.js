// device_types/energy_meter.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export async function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("Energy Meter") && !accessory.hasCapability("Switch");
}

export const relevantAttributes = ["energy"];

export async function initializeService(accessory) {
    const serviceName = `${accessory.context.deviceData.deviceid}_EnergyMeter`;
    const energySvc = accessory.getServiceByName(Service.Switch, serviceName) || accessory.addService(Service.Switch, serviceName, "Energy Meter");

    DeviceClass.addServiceToKeep(accessory, energySvc);

    // Kilowatt Hours Characteristic
    if (CommunityTypes.KilowattHours) {
        DeviceClass.getOrAddCharacteristic(accessory, energySvc, CommunityTypes.KilowattHours, {
            getHandler: function () {
                const energy = DeviceClass.clamp(accessory.context.deviceData.attributes.energy, 0, 100000);
                accessory.log.debug(`${accessory.name} | Energy Consumption: ${energy} kWh`);
                return typeof energy === "number" ? Math.round(energy) : 0;
            },
        });
    } else {
        accessory.log.warn(`${accessory.name} | CommunityTypes.KilowattHours not defined. Skipping KilowattHours characteristic.`);
    }

    accessory.context.deviceGroups.push("energy_meter");
}

export async function handleAttributeUpdate(accessory, change) {
    const serviceName = `${accessory.context.deviceData.deviceid}_EnergyMeter`;
    const energySvc = accessory.getServiceByName(Service.Switch, serviceName);

    if (!energySvc) {
        accessory.log.warn(`${accessory.name} | Energy Meter service not found`);
        return;
    }

    if (change.attribute === "energy" && CommunityTypes && CommunityTypes.KilowattHours) {
        const energy = DeviceClass.clamp(parseFloat(change.value), 0, 100000);
        DeviceClass.updateCharacteristicValue(accessory, energySvc, CommunityTypes.KilowattHours, Math.round(energy));
        // accessory.log.debug(`${accessory.name} | Updated Energy Consumption: ${energy} kWh`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}
