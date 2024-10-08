import crypto from "node:crypto";

import axios from "axios";
// @ts-ignore
import safeEval from "safe-eval";
import { parseScript, parseFunctionName } from "../utils.js";

import type { Video, streamType, DanmuItem } from "../types.js";

/**
 * 获取原始视频弹幕
 */
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

/**
 * 获取视频所有弹幕
 */
export async function getVideoDanmu(vid: string) {
  const items: DanmuItem[] = [];
  let startTime = 0;

  while (startTime !== -1) {
    const res = await getDanmu(vid, startTime);
    startTime = res.data.end_time;
    const list: any[] = res.data.list;
    items.push(...list);
  }
  return items;
}

/**
 * 获取视频point_id
 *  @param videoId 视频id
 */
export async function requestPointId(videoId: string) {
  const response = await axios.get(`https://v.douyu.com/show/${videoId}`);

  const reg = new RegExp(`{"vid":"${videoId}","point_id":(\\d+)`);

  return response.data.toString().match(reg)[1];
}

/**
 * 获取视频流
 * @param videoId 视频id
 */
export async function getStreamUrls(data: string): Promise<{
  timestamp: number;
  thumb_video: {
    [key: string]: {
      url: string;
      fsize: number;
      bit_rate: number;
      name: string;
      stream_type: streamType;
      level: number;
      stream_format: "264";
      now_free: number;
      has_pms: number;
    };
  };
}> {
  const response = await axios({
    method: "POST",
    data: data,
    url: "https://v.douyu.com/wgapi/vodnc/front/stream/getStreamUrlWeb",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data.data;
}

/**
 * 获取所有分p视频
 */
export async function getVideos(
  videoId: string,
  upId: string
): Promise<{
  data: string;
  list: {
    cover: string;
    hash_id: string;
    is_version: number;
    nickname: string;
    rank: number;
    show_id: string;
    show_remark: string;
    title: string;
    vid: number;
    video_duartion: number;
    view_num: number;
  }[];
}> {
  const response = await axios.get(
    `https://v.douyu.com/wgapi/vod/center/getShowReplayList`,
    {
      params: {
        vid: videoId,
        up_id: upId,
      },
    }
  );

  return response.data.data;
}

/**
 * 解析视频页
 */
export async function parseVideo(url: string): Promise<Video> {
  const decode = (response: any, data: any) => {
    const scripts = parseScript(response.data);
    const decodeScript = scripts.at(-2);
    // @ts-ignore
    const decodeFuction = parseFunctionName(decodeScript)[0];
    const pointId = data.ROOM.point_id;
    // 第二个参数: 从cookie中获取，试试看使用固定值
    const did = "d6122a55e9f2d9ff39d9092800001701";
    // 第三个参数: 时间戳 parseInt((new Date).getTime() / 1e3, 10)
    const s = Math.floor(new Date().getTime() / 1e3);
    // 加密后的字符串参数
    const p = safeEval(
      `(function func(){${decodeScript};return ${decodeFuction}(${pointId}, "${did}", ${s})})()`,
      {
        CryptoJS: {
          MD5: (str: string) => {
            return crypto.createHash("md5").update(str).digest("hex");
          },
        },
      }
    );
    // 最终参数
    const t = `${p}&vid=${data.ROOM.vid}`;

    return t;
  };

  const response = await axios.get(url);
  const regex = /window\.\$DATA\s*=\s*({.*?});/s;
  // Match the regular expression in the HTML
  const match = response.data.match(regex);

  if (match && match[1]) {
    // Extracted JSON data
    const jsonDataString = match[1];
    // console.log("jsonDataString", eval("(" + jsonDataString + ")"));
    const data = eval("(" + jsonDataString + ")");
    const decodeData = decode(response, data);
    return {
      ...data,
      decodeData,
    };
  } else {
    throw new Error("JSON data not found in the HTML.");
  }
}

/**
 * 获取回放视频列表
 */
export async function getReplayList(params: {
  up_id: string;
  page: number;
  limit: number;
}): Promise<{
  count: number;
  list: {
    cut_num: number;
    date_format: string;
    fan_num: number;
    re_num: number;
    show_id: number;
    time: string;
    time_format: string;
    title: string;
    video_list: {
      DefTag: string;
      author: string;
      authorIcon: string;
      hash_id: string;
      is_replay: string;
      point_id: number;
      start_time: number;
      title: string;
      typel: number;
      video_duration: number;
      video_pid: string;
      video_str_duration: string;
      video_type: number;
      view_num: string;
    }[];
  }[];
}> {
  const response = await axios.get(
    `https://v.douyu.com/wgapi/vod/center/authorShowVideoList`,
    {
      params: params,
    }
  );

  return response.data.data;
}

/**
 * 获取鱼吧Id
 */
export async function getFishBarId(roomId: number): Promise<number> {
  const response = await axios.get(
    `https://yuba.douyu.com/api/dy/anchor/anchorTopic`,
    {
      params: {
        room_id: roomId,
      },
    }
  );
  const path = response.request.path;

  if (path.includes("group")) {
    return path.split("/").pop();
  } else {
    throw new Error("获取鱼吧Id失败");
  }
}

/**
 * 获取鱼吧视频列表
 */
export async function getFishBarVideoList(params: {
  type: 1 | 2;
  group_id: number;
  page: number;
  lastid: number;
}): Promise<{
  message: string;
  normal: number;
  playbacks: number;
  status_code: number;
  list: {
    lastid: number;
    list: {
      /** 视频id */
      hash_id: string;
      uid: number;
      is_vertical: number;
      view_num: string;
      video_str_duration: string;
      duration: number;
      type: string;
      thumb: string;
      thumb_ver: string;
      player: string;
      from: string;
      swf: string;
      title: string;
      content: string;
      is_short: number;
      comments: string;
      barrages: string;
      post_id: string;
      /** 时间戳（秒） */
      create_time: number;
      ishide: boolean;
      resolution: string[];
      like_num: number;
      tag2: number;
      scheme_url: string;
      scheme_url_new: string;
    }[];
    time_line: string;
  }[];
}> {
  const response = await axios.get(
    `https://yuba.douyu.com/wbapi/web/group/videolist`,
    {
      params: params,
    }
  );

  return response.data.data;
}
