import log from "electron-log";
import { isDev } from "./env";

log.transports.file.level = "info";
log.transports.console.level = isDev ? "debug" : false;

export const logger = log;
