import axios from "axios";

export async function getDanmu(
  vid: string,
  startTime: number,
  endTime: number = -1
) {
  const url = "https://v.douyu.com/wgapi/vod/center/getBarrageList";
  const res = await axios.get(url, {
    params: {
      vid: vid,
      start_time: startTime,
      end_time: endTime,
    },
  });
  return res.data;
}
