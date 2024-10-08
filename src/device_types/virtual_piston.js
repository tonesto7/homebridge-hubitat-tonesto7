// device_types/virtual_piston.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Piston"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.Switch) || accessory.addService(Service.Switch, "Virtual Piston", "VirtualPiston");

        /**
         * Triggers the piston action.
         */
        function triggerPiston() {
            accessory.log.info(`${accessory.name} | Activating Virtual Piston`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, "piston");
            setTimeout(() => {
                accessory.context.deviceData.attributes.switch = "off";
                service.updateCharacteristic(Characteristic.On, false);
                accessory.log.debug(`${accessory.name} | Virtual Piston deactivated after trigger`);
            }, 1000); // Adjust timeout as needed based on piston action duration
        }

        // On/Off Characteristic
        service
            .getCharacteristic(Characteristic.On)
            .onGet(() => {
                const isOn = accessory.context.deviceData.attributes.switch === "on";
                accessory.log.debug(`${accessory.name} | Virtual Piston State Retrieved: ${isOn ? "ON" : "OFF"}`);
                return isOn;
            })
            .onSet((value) => {
                if (value) {
                    triggerPiston();
                }
            });

        // Status Active Characteristic
        service
            .getCharacteristic(Characteristic.StatusActive)
            .onGet(() => {
                const isActive = accessory.context.deviceData.status === "online";
                accessory.log.debug(`${accessory.name} | Virtual Piston Status Active Retrieved: ${isActive}`);
                return isActive;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set StatusActive characteristic, which is read-only.`);
            });

        accessory.context.deviceGroups.push("virtual_piston");
    },
};
