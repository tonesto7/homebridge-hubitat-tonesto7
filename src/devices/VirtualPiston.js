// devices/VirtualPiston.js
export class VirtualPiston {
  constructor(platform) {
    this.logManager = platform.logManager;
    this.Service = platform.Service;
    this.Characteristic = platform.Characteristic;
    this.generateSrvcName = platform.generateSrvcName;
  }

  static relevantAttributes = ["switch"];

  configure(accessory) {
    this.logManager.logDebug(
      `Configuring Virtual Piston for ${accessory.displayName}`,
    );
    const svc = accessory.getOrAddService(
      this.Service.Switch,
      accessory.displayName,
      "piston",
    );
    const devData = accessory.context.deviceData;

    accessory.getOrAddCharacteristic(svc, this.Characteristic.On, {
      getHandler: () => false,
      setHandler: (value) => {
        if (value) {
          accessory.sendCommand("piston");
          setTimeout(() => {
            devData.attributes.switch = "off";
            svc.getCharacteristic(this.Characteristic.On).updateValue(false);
          }, 1000);
        }
      },
    });

    return accessory;
  }

  // Handle attribute updates
  handleAttributeUpdate(accessory, update) {
    const { attribute, value } = update;
    this.logManager.logDebug(
      `VirtualPiston | ${accessory.displayName} | Attribute update: ${attribute} = ${value}`,
    );
    if (!VirtualPiston.relevantAttributes.includes(attribute)) return;

    const svc = accessory.getService(
      this.Service.Switch,
      this.generateSrvcName(accessory.displayName, "Piston"),
    );
    if (!svc) return;

    switch (attribute) {
      case "switch":
        // svc.getCharacteristic(this.Characteristic.On).updateValue(value === "on");
        break;
      default:
        this.logManager.logWarn(
          `VirtualPiston | ${accessory.displayName} | Unhandled attribute update: ${attribute} = ${value}`,
        );
    }
  }
}
