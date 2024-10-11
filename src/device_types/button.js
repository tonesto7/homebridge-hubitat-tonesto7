// device_types/button.js

export function isSupported(accessory) {
    return accessory.hasCapability("Button") || accessory.hasCapability("DoubleTapableButton") || accessory.hasCapability("HoldableButton") || accessory.hasCapability("PushableButton") || accessory.hasCapability("ReleasableButton");
}

export const relevantAttributes = ["button", "numberOfButtons"];

export function initializeAccessory(accessory, deviceClass) {
    const { Service, Characteristic } = deviceClass.platform;
    const btnCnt = deviceClass.clamp(accessory.context.deviceData.attributes.numberOfButtons || 1, 1, 10);

    accessory.log.debug(`${accessory.name} | Initializing button accessory with ${btnCnt} buttons`);

    for (let btnNum = 1; btnNum <= btnCnt; btnNum++) {
        const serviceName = `${accessory.context.deviceData.deviceid} Button ${btnNum}`;
        accessory.log.debug(`${accessory.name} | Initializing button service: ${serviceName}`);

        const service = accessory.getButtonSvcByName(Service.StatelessProgrammableSwitch, serviceName, btnNum);
        const validValues = getSupportedBtnValues(accessory, Characteristic);

        // Ensure the service is kept
        deviceClass.addServiceToKeep(accessory, service);
        // accessory.log.debug(`${accessory.name} | Button ${btnNum} valid values: ${validValues.join(", ")}`);

        // Set up ProgrammableSwitchEvent characteristic
        deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.ProgrammableSwitchEvent, {
            props: { validValues: validValues },
            eventOnly: false,
            getHandler: function () {
                return getButtonState(accessory.context.deviceData.attributes.button, accessory, Characteristic);
            },
        });

        // Set ServiceLabelIndex characteristic
        deviceClass.getOrAddCharacteristic(accessory, service, Characteristic.ServiceLabelIndex, {
            getHandler: function () {
                return btnNum;
            },
        });

        accessory.log.debug(`${accessory.name} | Button ${btnNum} service initialized`);
        accessory._buttonMap[serviceName] = service;
    }

    accessory.context.deviceGroups.push("button");
    deviceClass.platform.logGreen(`${accessory.name} | Button accessory initialized with ${btnCnt} buttons`);
}

export function handleAttributeUpdate(accessory, change, deviceClass) {
    const { Characteristic, Service } = deviceClass.platform;
    if (change.attribute === "button") {
        const btnVal = change.value;
        const btnNum = change.data && change.data.buttonNumber ? change.data.buttonNumber : 1;
        const serviceName = `${accessory.context.deviceData.deviceid} Button ${btnNum}`;
        const service = accessory.getButtonSvcByName(Service.StatelessProgrammableSwitch, serviceName, btnNum);
        if (service) {
            const btnOut = getButtonState(btnVal, accessory, Characteristic);
            if (btnOut >= 0) {
                accessory.log.info(`${accessory.name} | Updating Button ${btnNum} event to: ${btnOut}`);
                // service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(btnOut);
                deviceClass.updateCharacteristicValue(accessory, service, Characteristic.ProgrammableSwitchEvent, btnOut);
            }
        } else {
            accessory.log.warn(`${accessory.name} | No service found for button number: ${btnNum}`);
        }
    } else if (change.attribute === "numberOfButtons") {
        accessory.log.info(`${accessory.name} | Number of buttons changed to: ${change.value}`);
        initializeAccessory(accessory, deviceClass);
    }
}

function getSupportedBtnValues(accessory, Characteristic) {
    let validValues = [];
    if (accessory && accessory.getCapabilities().length) {
        if (accessory.hasCapability("PushableButton")) {
            validValues.push(Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS); // SINGLE_PRESS
        }
        if (accessory.hasCapability("DoubleTapableButton")) {
            validValues.push(Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS); // DOUBLE_PRESS
        }
        if (accessory.hasCapability("HoldableButton")) {
            validValues.push(Characteristic.ProgrammableSwitchEvent.LONG_PRESS); // LONG_PRESS
        }
        if (validValues.length < 1) {
            validValues.push(Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
            validValues.push(Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
        }
    } else {
        validValues.push(Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
        validValues.push(Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
    }
    return validValues;
}

function getButtonState(btnVal, accessory, Characteristic) {
    switch (btnVal) {
        case "pushed":
            accessory.log.debug(`${accessory.name} | Button State: pushed`);
            return Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
        case "doubleTapped":
            accessory.log.debug(`${accessory.name} | Button State: doubleTapped`);
            return Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
        case "held":
            accessory.log.debug(`${accessory.name} | Button State: held`);
            return Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
        default:
            accessory.log.warn(`${accessory.name} | Unknown button value: ${btnVal}`);
            return -1;
    }
}
