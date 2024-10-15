// device_types/outlet.js

let DeviceClass, Characteristic, Service, CommunityTypes;

export async function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("Outlet") && accessory.hasCapability("Switch");
}

export const relevantAttributes = ["switch"];

export async function initializeService(accessory) {
    const outletSvc = DeviceClass.getOrAddService(accessory, Service.Outlet);

    DeviceClass.getOrAddCharacteristic(accessory, outletSvc, Characteristic.On, {
        getHandler: function () {
            const isOn = accessory.context.deviceData.attributes.switch === "on";
            accessory.log.debug(`${accessory.name} | Outlet State Retrieved: ${isOn ? "ON" : "OFF"}`);
            return isOn;
        },
        setHandler: function (value) {
            const command = value ? "on" : "off";
            accessory.log.info(`${accessory.name} | Setting outlet state to ${command}`);
            accessory.sendCommand(null, accessory, accessory.context.deviceData, command);
        },
    });

    DeviceClass.getOrAddCharacteristic(accessory, outletSvc, Characteristic.OutletInUse, {
        getHandler: function () {
            const inUse = accessory.context.deviceData.attributes.switch === "on";
            accessory.log.debug(`${accessory.name} | Outlet In Use Retrieved: ${inUse}`);
            return inUse;
        },
    });

    accessory.context.deviceGroups.push("outlet");
}

export async function handleAttributeUpdate(accessory, change) {
    const outletSvc = accessory.getService(Service.Outlet);

    if (!outletSvc) {
        accessory.log.warn(`${accessory.name} | Outlet service not found`);
        return;
    }

    if (change.attribute === "switch") {
        const isOn = change.value === "on";
        DeviceClass.updateCharacteristicValue(accessory, outletSvc, Characteristic.On, isOn);
        DeviceClass.updateCharacteristicValue(accessory, outletSvc, Characteristic.OutletInUse, isOn);
        // accessory.log.debug(`${accessory.name} | Updated Outlet State: ${isOn ? "ON" : "OFF"}`);
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}
