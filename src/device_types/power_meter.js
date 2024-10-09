// device_types/power_meter.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Power Meter") && !accessory.hasCapability("Switch"),
    relevantAttributes: ["power", "status"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, CommunityTypes, Characteristic } = deviceClass.mainPlatform;
        const serviceName = `${accessory.context.deviceData.deviceid}_PowerMeter`;
        const existingService = accessory.getServiceByName(Service.Switch, serviceName);
        const service = existingService || accessory.addService(Service.Switch, serviceName, "Power Meter");

        // Watts Characteristic
        if (CommunityTypes && CommunityTypes.Watts) {
            service
                .getCharacteristic(CommunityTypes.Watts)
                .onGet(() => {
                    let power = parseFloat(accessory.context.deviceData.attributes.power);
                    power = deviceClass.clamp(power, 0, 100000); // Adjust max as per device specifications
                    accessory.log.debug(`${accessory.name} | Power Consumption Retrieved: ${power} Watts`);
                    return typeof power === "number" ? Math.round(power) : 0;
                })
                .onSet((value) => {
                    // Typically, Watts is a read-only characteristic. If writable, implement accordingly.
                    accessory.log.warn(`${accessory.name} | Attempted to set Watts characteristic, which is read-only.`);
                });
        } else {
            accessory.log.warn(`${accessory.name} | CommunityTypes.Watts not defined. Skipping Watts characteristic.`);
        }

        // Status Active Characteristic
        service
            .getCharacteristic(Characteristic.StatusActive)
            .onGet(() => {
                const isActive = accessory.context.deviceData.status === "online";
                accessory.log.debug(`${accessory.name} | Power Meter Status Active Retrieved: ${isActive}`);
                return isActive;
            })
            .onSet((value) => {
                // StatusActive is typically read-only. If writable, implement accordingly.
                accessory.log.warn(`${accessory.name} | Attempted to set StatusActive characteristic, which is read-only.`);
            });

        accessory.context.deviceGroups.push("power_meter");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { CommunityTypes, Characteristic, Service } = deviceClass.mainPlatform;
        const serviceName = `${accessory.context.deviceData.deviceid}_PowerMeter`;
        const service = accessory.getServiceByName(Service.Switch, serviceName);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Power Meter service not found`);
            return;
        }

        switch (change.attribute) {
            case "power":
                if (CommunityTypes && CommunityTypes.Watts) {
                    const power = deviceClass.clamp(parseFloat(change.value), 0, 100000);
                    service.updateCharacteristic(CommunityTypes.Watts, Math.round(power));
                    accessory.log.debug(`${accessory.name} | Updated Power Consumption: ${power} Watts`);
                }
                break;
            case "status":
                const isActive = change.value === "online";
                service.updateCharacteristic(Characteristic.StatusActive, isActive);
                accessory.log.debug(`${accessory.name} | Updated Status Active: ${isActive}`);
                break;
            default:
                accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};
