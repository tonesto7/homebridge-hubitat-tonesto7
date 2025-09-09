// index.js

import { pluginName, platformName } from "./StaticConst.js";
import HubitatPlatform from "./HubitatPlatform.js";

export default function (homebridge) {
    homebridge.registerPlatform(pluginName, platformName, HubitatPlatform, true);
}
