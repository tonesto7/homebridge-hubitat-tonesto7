// device_types/virtual_mode.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Mode"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
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
};
