// device_types/virtual_mode.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Mode"),
    relevantAttributes: ["switch", "status"],

    initializeAccessory: (accessory, deviceClass) => {
        const { Service, Characteristic } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Switch) || accessory.addService(Service.Switch, "Virtual Mode", "VirtualMode");

        /**
         * Clamps a value between a minimum and maximum.
         * @param {boolean} value - The value to set.
         */
        function setMode(value) {
            if (value && accessory.context.deviceData.attributes.switch === "off") {
                accessory.log.info(`${accessory.name} | Activating Virtual Mode`);
                accessory.sendCommand(null, accessory, accessory.context.deviceData, "mode");
            }
        }

        // On/Off Characteristic
        service
            .getCharacteristic(Characteristic.On)
            .onGet(() => {
                const isOn = accessory.context.deviceData.attributes.switch === "on";
                accessory.log.debug(`${accessory.name} | Virtual Mode State Retrieved: ${isOn ? "ON" : "OFF"}`);
                return isOn;
            })
            .onSet((value) => {
                setMode(value);
            });

        // Status Active Characteristic
        service
            .getCharacteristic(Characteristic.StatusActive)
            .onGet(() => {
                const isActive = accessory.context.deviceData.status === "online";
                accessory.log.debug(`${accessory.name} | Virtual Mode Status Active Retrieved: ${isActive}`);
                return isActive;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set StatusActive characteristic, which is read-only.`);
            });

        accessory.context.deviceGroups.push("virtual_mode");
    },

    handleAttributeUpdate: (accessory, change, deviceClass) => {
        const { Characteristic, Service } = deviceClass.mainPlatform;
        const service = accessory.getService(Service.Switch);

        if (!service) {
            accessory.log.warn(`${accessory.name} | Virtual Mode service not found`);
            return;
        }

        switch (change.attribute) {
            case "switch":
                const isOn = change.value === "on";
                service.updateCharacteristic(Characteristic.On, isOn);
                accessory.log.debug(`${accessory.name} | Updated Virtual Mode State: ${isOn ? "ON" : "OFF"}`);
                break;
            case "status":
                const isActive = change.value === "online";
                service.updateCharacteristic(Characteristic.StatusActive, isActive);
                accessory.log.debug(`${accessory.name} | Updated Virtual Mode Status Active: ${isActive}`);
                break;
            default:
                accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
        }
    },
};
