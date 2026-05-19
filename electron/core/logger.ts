import log from "electron-log";
import { app } from "electron";

export const isDev = !app.isPackaged;

log.transports.file.level = "info";
log.transports.console.level = isDev ? "debug" : false;

export const logger = log;
