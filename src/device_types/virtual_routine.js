// device_types/virtual_routine.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Routine"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const service = accessory.getService(Service.Switch) || accessory.addService(Service.Switch, "Virtual Routine", "VirtualRoutine");

        /**
         * Triggers the routine action.
         */
        function triggerRoutine() {
            accessory.log.info(`${accessory.name} | Activating Virtual Routine`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, "routine");
            setTimeout(() => {
                accessory.context.deviceData.attributes.switch = "off";
                service.updateCharacteristic(Characteristic.On, false);
                accessory.log.debug(`${accessory.name} | Virtual Routine deactivated after trigger`);
            }, 1000); // Adjust timeout as needed based on routine action duration
        }

        // On/Off Characteristic
        service
            .getCharacteristic(Characteristic.On)
            .onGet(() => {
                const isOn = accessory.context.deviceData.attributes.switch === "on";
                accessory.log.debug(`${accessory.name} | Virtual Routine State Retrieved: ${isOn ? "ON" : "OFF"}`);
                return isOn;
            })
            .onSet((value) => {
                if (value) {
                    triggerRoutine();
                }
            });

        // Status Active Characteristic
        service
            .getCharacteristic(Characteristic.StatusActive)
            .onGet(() => {
                const isActive = accessory.context.deviceData.status === "online";
                accessory.log.debug(`${accessory.name} | Virtual Routine Status Active Retrieved: ${isActive}`);
                return isActive;
            })
            .onSet(() => {
                accessory.log.warn(`${accessory.name} | Attempted to set StatusActive characteristic, which is read-only.`);
            });

        accessory.context.deviceGroups.push("virtual_routine");
    },
};
