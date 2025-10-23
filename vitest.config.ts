import { defineLibVitestConfig } from "sborshik/vite";
import { ConfigsManager } from "sborshik/utils/configs-manager";

export default defineLibVitestConfig(ConfigsManager.create());