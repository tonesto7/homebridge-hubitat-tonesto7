// devices/Button.js
export class Button {
    constructor(platform) {
        this.logManager = platform.logManager;
        this.Service = platform.Service;
        this.Characteristic = platform.Characteristic;
        this._buttonMap = new Map();
    }

    static relevantAttributes = ["button", "numberOfButtons"];

    configure(accessory) {
        this.logManager.logDebug(`Configuring Button for ${accessory.displayName}`);
        const _service = this.Service.StatelessProgrammableSwitch;
        const buttonCount = Math.min(Math.max(accessory.context.deviceData.attributes.numberOfButtons || 1, 1), 10);
        const validValues = this._getSupportedButtonValues(accessory);

        for (let btnNum = 1; btnNum <= buttonCount; btnNum++) {
            // Handle old and new service names
            const oldServiceName = `${accessory.context.deviceData.deviceid}_${btnNum}`;
            const newServiceName = `${accessory.context.deviceData.deviceid} Button ${btnNum}`;

            // Look for existing service in both old and new formats
            let btnService = accessory.services.find((s) => s.UUID === _service.UUID && (s.displayName === oldServiceName || s.subtype === btnNum.toString()));

            // Update old format service name if found
            if (btnService && btnService.displayName === oldServiceName) {
                this.logManager.logInfo(`Upgrading button service name from ${oldServiceName} to ${newServiceName}`);
                const nameChar = btnService.getCharacteristic(this.Characteristic.Name);
                if (nameChar) {
                    nameChar.updateValue(newServiceName);
                }
            }

            // Get or create the service
            btnService = accessory.getOrAddService(_service, newServiceName, btnNum.toString());

            // Add ProgrammableSwitchEvent characteristic
            accessory.getOrAddCharacteristic(btnService, this.Characteristic.ProgrammableSwitchEvent, {
                props: { validValues },
                eventOnly: true,
                getHandler: () => null,
            });

            // Add ServiceLabelIndex characteristic
            accessory.getOrAddCharacteristic(btnService, this.Characteristic.ServiceLabelIndex).updateValue(btnNum);
        }

        return accessory;
    }

    _getSupportedButtonValues(accessory) {
        const values = [];
        if (accessory.hasCapability("PushableButton")) {
            values.push(this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
        }
        if (accessory.hasCapability("DoubleTapableButton")) {
            values.push(this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
        }
        if (accessory.hasCapability("HoldableButton")) {
            values.push(this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
        }
        // Default if no capabilities specified
        if (values.length === 0) {
            values.push(this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
            values.push(this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
        }
        return values;
    }

    // Handle attribute updates
    handleAttributeUpdate(accessory, update) {
        const { attribute, value, data } = update;
        this.logManager.logDebug(`Button | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`);
        if (!Button.relevantAttributes.includes(attribute)) return;

        switch (attribute) {
            case "button":
                const buttonNumber = data?.buttonNumber;
                if (!buttonNumber) return;

                const svc = accessory.getService(this.Service.StatelessProgrammableSwitch, `${accessory.context.deviceData.deviceid} Button ${buttonNumber}`);
                if (!svc) return;

                const characteristic = svc.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent);
                if (!characteristic) return;

                let eventValue;
                switch (value) {
                    case "pushed":
                        eventValue = this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
                        break;
                    case "held":
                        eventValue = this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
                        break;
                    case "doubleTapped":
                        eventValue = this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
                        break;
                    default:
                        return;
                }
                characteristic.updateValue(eventValue);
                break;
            case "numberOfButtons":
                const buttonCount = Math.min(Math.max(value, 1), 10);
                this.logManager.logDebug(`Button | ${accessory.displayName} | Number of buttons updated to ${buttonCount}`);
                break;

            default:
                this.logManager.logWarn(`Button | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }
}
