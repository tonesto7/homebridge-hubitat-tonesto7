// device_types/button.js

module.exports = {
    isSupported: (accessory) => accessory.hasCapability("Button") || accessory.hasCapability("DoubleTapableButton") || accessory.hasCapability("HoldableButton") || accessory.hasCapability("PushableButton") || accessory.hasCapability("ReleasableButton"),

    initializeAccessory: (accessory, deviceTypes) => {
        const { Service, Characteristic } = deviceTypes.mainPlatform;
        const btnCnt = clamp(accessory.context.deviceData.attributes.numberOfButtons || 1, 1, 10); // Assuming max 10 buttons

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

        for (let bNum = 1; bNum <= btnCnt; bNum++) {
            const serviceName = `${accessory.context.deviceData.deviceid}_Button_${bNum}`;
            const existingService = accessory.getServiceByName(Service.StatelessProgrammableSwitch, serviceName);
            const service = existingService || accessory.addService(Service.StatelessProgrammableSwitch, serviceName, bNum);

            // Define valid switch events based on capabilities
            let validValues = [Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS];
            if (accessory.hasCapability("DoubleTapableButton")) {
                validValues.push(Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
            }
            if (accessory.hasCapability("HoldableButton")) {
                validValues.push(Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
            }

            // Configure ProgrammableSwitchEvent characteristic
            service
                .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
                .setProps({ validValues })
                .onGet(() => null); // Event-only characteristic

            // Set Service Label Index for identification
            service.getCharacteristic(Characteristic.ServiceLabelIndex).setValue(bNum);

            // Map service for event handling
            deviceTypes._buttonMap[`${accessory.context.deviceData.deviceid}_Button_${bNum}`] = service;
        }

        // Handle button events
        accessory.on("button", (btnNum, btnVal) => {
            const service = deviceTypes._buttonMap[`${accessory.context.deviceData.deviceid}_Button_${btnNum}`];
            if (service) {
                let btnOut;
                switch (btnVal) {
                    case "pushed":
                        btnOut = Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
                        accessory.log.info(`${accessory.name} | Button Single Press ${btnNum} event: ${btnVal}`);
                        break;
                    case "doubleTapped":
                        btnOut = Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
                        accessory.log.info(`${accessory.name} | Button Double Press ${btnNum} event: ${btnVal}`);
                        break;
                    case "held":
                        btnOut = Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
                        accessory.log.info(`${accessory.name} | Button Long Press ${btnNum} event: ${btnVal}`);
                        break;
                    default:
                        accessory.log.warn(`${accessory.name} | Unknown button value: ${btnVal}`);
                }
                if (btnOut !== undefined) {
                    accessory.log.info(`B${accessory.name} | utton ${btnNum} event: ${btnVal}`);
                    service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(btnOut);
                }
            } else {
                accessory.log.warn(`${accessory.name} | No service found for button number: ${btnNum}`);
            }
        });

        accessory.context.deviceGroups.push("button");
    },
};
