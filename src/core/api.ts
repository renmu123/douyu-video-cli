import axios from "axios";
import douyu_encrypt from "../utils/douyu_source_script";

/**
 * 获取视频弹幕
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
 * 获取视频point_id
 *  @param videoId 视频id
 */
async function requestPointId(videoId: string) {
  const response = await axios.get(`https://v.douyu.com/show/${videoId}`);

  const reg = new RegExp(`{"vid":"${videoId}","point_id":(\\d+)`);

  return response.data.toString().match(reg)[1];
}

/**
 * 获取视频流加密参数
 * @param videoId 视频id
 */
async function parseParams(videoId: string) {
  // 第一个参数: pointId
  const pointId = await requestPointId(videoId);

  // 第二个参数: 固定值 '10000000000000000000000000001501'
  const did = "d6122a55e9f2d9ff39d9092800001701";

  // 第三个参数: 时间戳 parseInt((new Date).getTime() / 1e3, 10)
  const s = Math.floor(new Date().getTime() / 1e3);

  // 加密后的字符串参数
  const p = douyu_encrypt(pointId, did, s);

  // 最终参数
  const t = `${p}&vid=${videoId}`;

  return t;
}

/**
 * 获取视频流
 * @param videoId 视频id
 */
export async function getStreamUrls(videoId: string): Promise<{
  timestamp: number;
  thumb_video: {
    [key: string]: {
      url: string;
      fsize: number;
      bit_rate: number;
      name: string;
      stream_type: "normal";
      level: number;
      stream_format: "264";
      now_free: number;
      has_pms: number;
    };
  };
}> {
  const data = await parseParams(videoId);
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
export async function parseVideo(videoId: string): Promise<{
  ROOM: {
    vid: string;
    point_id: string;
    up_id: string;
    author_name: string;
    name: string;
  };
  DATA: {
    content: {
      room_id: string;
    };
  };
}> {
  const response = await axios.get(`https://v.douyu.com/show/${videoId}`);

  const regex = /window\.\$DATA\s*=\s*({.*?});/s;

  // Match the regular expression in the HTML
  const match = response.data.match(regex);

  if (match && match[1]) {
    // Extracted JSON data
    const jsonDataString = match[1];
    // console.log("jsonDataString", eval("(" + jsonDataString + ")"));
    return eval("(" + jsonDataString + ")");
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
 * 获取直播间
 */
export async function getRoomInfo(roomId: number): Promise<{
  room: {
    up_id: string;
    nickname: string;
  };
}> {
  const response = await axios.get(`https://www.douyu.com/betard/${roomId}`);

  return response.data;
}
