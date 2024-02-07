import { readConfig, writeConfig } from "./config";
import { getRoomInfo, getFishBarId } from "./api";

const subscribe = async (roomId: number) => {
  const config = await readConfig();
  const upList = config.upList;

  if (upList.find(item => item.roomId === roomId)) {
    throw new Error("已经订阅过了");
  }
  const room = await getRoomInfo(roomId);
  if (!room.room) throw new Error("请确认房间号是否正确");

  const fishBarId = await getFishBarId(roomId);

  const item = {
    roomId: roomId,
    name: room.room.nickname,
    upId: room.room.up_id,
    fishBarId,
  };

  config.upList.push(item);
  await writeConfig("upList", config.upList);
  logger.info(`已订阅${item.name}`);
};
const unSubscribe = async (roomId: number) => {
  const config = await readConfig();
  const upList = config.upList;
  if (!upList.find(item => item.roomId === roomId)) {
    throw new Error("未订阅过该主播");
  }
  config.upList = config.upList.filter(item => item.roomId !== roomId);
  await writeConfig("upList", config.upList);
};

const list = async () => {
  const config = await readConfig();
  return config.upList;
};

export default {
  subscribe,
  unSubscribe,
  list,
};
