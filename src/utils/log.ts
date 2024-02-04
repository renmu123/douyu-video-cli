import winston from "winston";

import { logPath, readConfig } from "../core/config";

const { combine, timestamp, printf } = winston.format;
const myFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

const logger = winston.createLogger({
  format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), myFormat),
  transports: [
    new winston.transports.Console({
      level: "info",
    }),
  ],
});

const setLogLevel = async () => {
  const config = await readConfig();
  const level = config.logLevel;
  logger.add(new winston.transports.File({ filename: logPath, level: level }));
};

setLogLevel();

export default logger;
