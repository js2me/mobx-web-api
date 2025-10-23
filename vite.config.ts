import { defineLibViteConfig } from "sborshik/vite";
import { ConfigsManager } from "sborshik/utils/configs-manager";

export default defineLibViteConfig(ConfigsManager.create()); 