import os from "node:os";
import path from "node:path";
import fs from "fs-extra";

import type { Config } from "../types/index";

export const appPath = path.join(os.homedir(), ".douyu-video-cli");
export const configPath = path.join(appPath, "config.json");
export const dataPath = path.join(appPath, "data.json");
export const logPath = path.join(appPath, "log.txt");

fs.ensureDir(appPath);

interface Data {
  videoId: string;
}

const defaultConfig: Config = {
  upList: [],
  downloadPath: path.join(appPath, "videos"),
  ffmpegBinPath: "",
  logLevel: "error",
};

export const readConfig = async (): Promise<Config> => {
  if (!(await fs.pathExists(configPath))) {
    await fs.writeJSON(configPath, defaultConfig);
  }
  const config = await fs.readJSON(configPath);

  return {
    ...defaultConfig,
    ...config,
  };
};

export const writeConfig = async <K extends keyof Config>(
  key: K,
  value: Config[K]
) => {
  const config = await readConfig();
  config[key] = value;
  await fs.writeJSON(configPath, config);
};

export const readData = async (): Promise<Data[]> => {
  if (!(await fs.pathExists(dataPath))) {
    await fs.writeJSON(dataPath, []);
  }
  const data = await fs.readJSON(dataPath);
  return data;
};

export const pushData = async (item: Data) => {
  const data = await readData();
  data.push(item);
  await fs.writeJSON(dataPath, data);
};

export const deleteData = async (videoId: string) => {
  let data = await readData();
  data = data.filter(item => item.videoId !== videoId);
  await fs.writeJSON(dataPath, data);
};
