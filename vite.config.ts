import { ConfigsManager } from 'sborshik/utils/configs-manager';
import { defineLibViteConfig } from 'sborshik/vite';

export default defineLibViteConfig(ConfigsManager.create());
