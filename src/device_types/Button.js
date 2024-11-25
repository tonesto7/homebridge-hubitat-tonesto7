// device_types/Button.js

import HubitatBaseAccessory from "./BaseAccessory.js";

export default class Button extends HubitatBaseAccessory {
    constructor(platform, accessory) {
        super(platform, accessory);
    }

    static relevantAttributes = ["button", "numberOfButtons"];

    async configureServices() {
        try {
            // Get number of buttons, clamp between 1 and 10
            const buttonCount = Math.min(Math.max(this.deviceData.attributes.numberOfButtons || 1, 1), 10);

            this.logManager.logDebug(`${this.deviceData.name} | Initializing button accessory with ${buttonCount} buttons`);

            // Configure each button
            for (let buttonNumber = 1; buttonNumber <= buttonCount; buttonNumber++) {
                await this.configureButton(buttonNumber);
            }

            return true;
        } catch (error) {
            this.logManager.logError(`Button | ${this.deviceData.name} | Error configuring services:`, error);
            throw error;
        }
    }

    async configureButton(buttonNumber) {
        // Define both old and new format names
        const oldServiceName = `${this.deviceData.deviceid}_${buttonNumber}`;
        const newServiceName = `${this.deviceData.deviceid} Button ${buttonNumber}`;

        this.logManager.logDebug(`${this.deviceData.name} | Initializing button service: ${newServiceName}`);

        // Look for service in both old and new formats
        let buttonService = this.accessory.services.find((service) => service.UUID === this.Service.StatelessProgrammableSwitch.UUID && (service.displayName === oldServiceName || service.subtype === buttonNumber.toString()));

        // If we found an old format service, remove it
        if (buttonService && buttonService.displayName === oldServiceName) {
            this.logManager.logInfo(`Upgrading button service from ${oldServiceName} to ${newServiceName}`);
            // const index = this.accessory.services.indexOf(buttonService);
            // if (index > -1) {
            //     this.accessory.services.splice(index, 1);
            // }

            // Ensure Name characteristic is set correctly
            this.getOrAddCharacteristic(buttonService, this.Characteristic.Name, {
                value: newServiceName,
            });
            // buttonService = null;
        }

        // Create new service if needed
        if (!buttonService) {
            buttonService = this.getOrAddService(this.Service.StatelessProgrammableSwitch, newServiceName, buttonNumber.toString());
        }

        // Store in context and track service
        const serviceId = this.getServiceId(buttonService);
        this.accessory.context.state.buttons.services[buttonNumber] = serviceId;
        this.stateManager.trackService(this.accessory, buttonService);

        // Configure characteristics
        const validValues = this.getSupportedButtonValues();

        // Programmable Switch Event characteristic
        this.getOrAddCharacteristic(buttonService, this.Characteristic.ProgrammableSwitchEvent, {
            props: { validValues: validValues },
            eventOnly: true,
            getHandler: () => this.getButtonState(buttonNumber),
        });

        // Service Label Index characteristic
        this.getOrAddCharacteristic(buttonService, this.Characteristic.ServiceLabelIndex, {
            getHandler: () => buttonNumber,
        });

        this.logManager.logDebug(`Button | ${this.deviceData.name} | Button ${buttonNumber} service initialized`);
    }

    getSupportedButtonValues() {
        const values = new Set();
        const ProgrammableSwitchEvent = this.Characteristic.ProgrammableSwitchEvent;

        if (this.hasCapability("PushableButton")) {
            values.add(ProgrammableSwitchEvent.SINGLE_PRESS);
        }
        if (this.hasCapability("DoubleTapableButton")) {
            values.add(ProgrammableSwitchEvent.DOUBLE_PRESS);
        }
        if (this.hasCapability("HoldableButton")) {
            values.add(ProgrammableSwitchEvent.LONG_PRESS);
        }

        // Default if no specific capabilities
        if (values.size === 0) {
            values.add(ProgrammableSwitchEvent.SINGLE_PRESS);
            values.add(ProgrammableSwitchEvent.LONG_PRESS);
        }

        return Array.from(values);
    }

    getButtonState(buttonNumber) {
        return this.accessory.context.state.buttons.states[buttonNumber] || null;
    }

    async handleAttributeUpdate(change) {
        const { attribute, value, data } = change;

        switch (attribute) {
            case "button":
                const buttonNumber = data.buttonNumber || 1;
                const serviceId = this.accessory.context.state.buttons.services[buttonNumber];
                const service = this.accessory.services.find((s) => this.getServiceId(s) === serviceId);

                if (!service) {
                    this.logManager.logWarn(`No service found for button ${buttonNumber}`);
                    return;
                }

                const eventValue = this.transformButtonValue(value);
                if (eventValue !== null) {
                    // Store state in context
                    this.accessory.context.state.buttons.states[buttonNumber] = eventValue;

                    service.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent).updateValue(eventValue);

                    this.logManager.logDebug(`${this.deviceData.name} | Button ${buttonNumber} event: ${value} transformed to ${eventValue}`);
                }
                break;
            default:
                this.logManager.logDebug(`Button | ${this.deviceData.name} | Unhandled attribute update: ${attribute} = ${value}`);
        }
    }

    transformButtonValue(value) {
        switch (value) {
            case "pushed":
                return this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
            case "doubleTapped":
                return this.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
            case "held":
                return this.Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
            default:
                this.logManager.logWarn(`Button | ${this.deviceData.name} | Unknown button value: ${value}`);
                return null;
        }
    }

    async cleanup() {
        // Call parent cleanup
        this.buttonService = null;
        super.cleanup();
    }
}
