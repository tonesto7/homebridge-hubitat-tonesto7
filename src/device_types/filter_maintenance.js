// device_types/filter_maintenance.js

import { get } from "lodash";

let DeviceClass, Characteristic, Service, CommunityTypes;

export function init(_deviceClass, _Characteristic, _Service, _CommunityTypes) {
    DeviceClass = _deviceClass;
    Characteristic = _Characteristic;
    Service = _Service;
    CommunityTypes = _CommunityTypes;
}

export function isSupported(accessory) {
    return accessory.hasCapability("FilterStatus") && accessory.hasAttribute("filterStatus");
}

export const relevantAttributes = ["filterStatus"];

export function initializeAccessory(accessory) {
    const filterSvc = DeviceClass.getOrAddService(accessory, Service.FilterMaintenance);

    DeviceClass.getOrAddCharacteristic(accessory, filterSvc, Characteristic.FilterChangeIndication, {
        getHandler: function () {
            const doReplace = accessory.context.deviceData.attributes.switch === "replace";
            accessory.log.debug(`${accessory.name} | SFilterChangeIndication Retrieved: ${doReplace ? "REPLACE" : "OFF"}`);
            return getFilterStatus(accessory.context.deviceData.attributes.filterStatus);
        },
    });

    accessory.context.deviceGroups.push("filter_maintenance");
}

export function handleAttributeUpdate(accessory, change) {
    const filterSvc = accessory.getService(Service.FilterMaintenance);
    if (!filterSvc) {
        accessory.log.warn(`${accessory.name} | Switch service not found`);
        return;
    }

    if (change.attribute === "filterStatus") {
        DeviceClass.updateCharacteristicValue(accessory, filterSvc, Characteristic.FilterChangeIndication, getFilterStatus(change.value));
    } else {
        accessory.log.debug(`${accessory.name} | Unhandled attribute update: ${change.attribute}`);
    }
}

function getFilterStatus(filterStatus) {
    return filterStatus === "replace" ? Characteristic.FilterChangeIndication.CHANGE_FILTER : Characteristic.FilterChangeIndication.FILTER_OK;
}
