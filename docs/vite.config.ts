import { ConfigsManager } from 'sborshik/utils/configs-manager';
import { defineDocsBuildConfig } from "sborshik/vitepress";

const configs = ConfigsManager.create('../'); 

export default defineDocsBuildConfig(configs); 
