// device_types/Button.js

import HubitatAccessory from "../HubitatAccessory.js";

export default class Button extends HubitatAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
        this.deviceData = accessory.context.deviceData;
        this.relevantAttributes = ["button", "numberOfButtons"];
    }

    initializeService() {
        const btnCnt = this.clamp(this.deviceData.attributes.numberOfButtons || 1, 1, 10);

        this.log.debug(`${this.accessory.displayName} | Initializing button accessory with ${btnCnt} buttons`);

        for (let btnNum = 1; btnNum <= btnCnt; btnNum++) {
            const serviceName = `${this.deviceData.deviceid} Button ${btnNum}`;
            this.log.debug(`${this.accessory.displayName} | Initializing button service: ${serviceName}`);

            const buttonSvc = this.getButtonService(this.Service.StatelessProgrammableSwitch, serviceName, btnNum);
            const validValues = this.getSupportedBtnValues();

            this.getOrAddCharacteristic(buttonSvc, this.Characteristic.ProgrammableSwitchEvent, {
                props: { validValues: validValues },
                eventOnly: false,
                getHandler: () => this.getButtonState(this.deviceData.attributes.button),
            });

            this.getOrAddCharacteristic(buttonSvc, this.Characteristic.ServiceLabelIndex, {
                getHandler: () => btnNum,
            });

            this.log.debug(`${this.accessory.displayName} | Button ${btnNum} service initialized`);
            this.accessory._buttonMap[serviceName] = buttonSvc;
        }

        this.log.info(`${this.accessory.displayName} | Button accessory initialized with ${btnCnt} buttons`);
        this.accessory.context.deviceGroups.push("button");
    }

    handleAttributeUpdate(change) {
        if (change.attribute === "button") {
            const btnVal = change.value;
            const btnNum = change.data && change.data.buttonNumber ? change.data.buttonNumber : 1;
            const serviceName = `${this.deviceData.deviceid} Button ${btnNum}`;
            const buttonSvc = this.getButtonService(this.Service.StatelessProgrammableSwitch, serviceName, btnNum);
            if (buttonSvc) {
                const btnOut = this.getButtonState(btnVal);
                if (btnOut >= 0) {
                    this.log.info(`${this.accessory.displayName} | Updating Button ${btnNum} event to: ${btnOut}`);
                    this.updateCharacteristicValue(buttonSvc, this.Characteristic.ProgrammableSwitchEvent, btnOut);
                }
            } else {
                this.log.warn(`${this.accessory.displayName} | No service found for button number: ${btnNum}`);
            }
        } else if (change.attribute === "numberOfButtons") {
            this.log.info(`${this.accessory.displayName} | Number of buttons changed to: ${change.value}`);
            this.initializeService();
        }
    }

    getButtonService(serviceType, displayName, subType) {
        this.log.debug(`${this.accessory.displayName} | Getting or adding button service: ${displayName} (subType: ${subType})`);

        let svc = this.accessory.services.find((s) => s.UUID === serviceType.UUID && s.subtype === subType);

        if (!svc) {
            const oldServiceName = `${this.deviceData.deviceid}_${subType}`;
            svc = this.accessory.services.find((s) => s.displayName === oldServiceName);

            if (svc) {
                this.log.debug(`${this.accessory.displayName} | Found existing service with old naming scheme: ${oldServiceName}. Updating to new naming.`);
                svc.displayName = displayName;
                svc.subtype = subType;
            }
        }

        if (!svc) {
            this.log.debug(`${this.accessory.displayName} | Adding new service for: ${displayName} (subType: ${subType})`);
            svc = new serviceType(displayName, subType);
            this.accessory.addService(svc);
        } else {
            this.log.debug(`${this.accessory.displayName} | Reusing existing service for: ${displayName} (subType: ${subType})`);
        }

        this.addServiceToKeep(svc);

        return svc;
    }

    getSupportedBtnValues() {
        let validValues = [];
        if (this.hasCapability("PushableButton")) {
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
        }
        if (this.hasCapability("DoubleTapableButton")) {
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
        }
        if (this.hasCapability("HoldableButton")) {
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
        }
        if (validValues.length < 1) {
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
            validValues.push(this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
        }
        return validValues;
    }

    getButtonState(btnVal) {
        switch (btnVal) {
            case "pushed":
                this.log.debug(`${this.accessory.displayName} | ButtonState: pushed`);
                return this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
            case "doubleTapped":
                this.log.debug(`${this.accessory.displayName} | ButtonState: doubleTapped`);
                return this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
            case "held":
                this.log.debug(`${this.accessory.displayName} | ButtonState: held`);
                return this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
            default:
                this.log.warn(`${this.accessory.displayName} | Unknown button value: ${btnVal}`);
                return -1;
        }
    }
}
