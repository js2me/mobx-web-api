import { ConfigsManager } from 'sborshik/utils/configs-manager';
import { defineLibVitestConfig } from 'sborshik/vite';

export default defineLibVitestConfig(ConfigsManager.create());
