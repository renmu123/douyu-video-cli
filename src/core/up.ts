import { Client, TvQrcodeLogin } from "@renmu/bili-api";
import { readConfig, writeConfig } from "./config";

const getUserInfo = async (uid: number) => {
  const client = new Client();
  const data = await client.user.getUserInfo(uid);
  return data;
};

export const login = async () => {
  const tv = new TvQrcodeLogin();
  const url = await tv.login();
  return { url, tv };
};

const subscribe = async (uid: number) => {
  const config = await readConfig();
  const upList = config.upList;

  if (upList.find(item => item.uid === uid)) {
    throw new Error("已经订阅过了");
  }
  const data = await getUserInfo(uid).catch(e => {
    throw new Error(`${uid}: ${e.message}`);
  });
  const item = {
    uid: data.mid,
    name: data.name,
    avatar: data.face,
  };

  config.upList.push(item);
  await writeConfig("upList", config.upList);
};
const unSubscribe = async (uid: number) => {
  const config = await readConfig();
  const upList = config.upList;
  if (!upList.find(item => item.uid === uid)) {
    throw new Error("未订阅过该主播");
  }
  config.upList = config.upList.filter(item => item.uid !== uid);
  await writeConfig("upList", config.upList);
};

const list = async () => {
  const config = await readConfig();
  return config.upList;
};

export default {
  subscribe,
  unSubscribe,
  login,
  list,
};
