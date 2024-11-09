// index.js

import { pluginName, platformName } from "./Constants.js";
import HubitatPlatform from "./HE_Platform.js";

export default function (homebridge) {
    homebridge.registerPlatform(pluginName, platformName, HubitatPlatform);
}
