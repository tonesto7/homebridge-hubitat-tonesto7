// device_types/power_meter.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Power Meter") && !accessory.hasCapability("Switch"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, CommunityTypes, Characteristic } = deviceTypes.mainPlatform;
        const serviceName = `${accessory.context.deviceData.deviceid}_PowerMeter`;
        const existingService = accessory.getServiceByName(Service.Switch, serviceName);
        const service = existingService || accessory.addService(Service.Switch, serviceName, "Power Meter");

        /**
         * Clamps a value between a minimum and maximum.
         * @param {number} value - The value to clamp.
         * @param {number} min - The minimum allowable value.
         * @param {number} max - The maximum allowable value.
         * @returns {number} - The clamped value.
         */
        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        // Watts Characteristic
        if (CommunityTypes && CommunityTypes.Watts) {
            service
                .getCharacteristic(CommunityTypes.Watts)
                .onGet(() => {
                    let power = parseFloat(accessory.context.deviceData.attributes.power);
                    power = clamp(power, 0, 100000); // Adjust max as per device specifications
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
};
