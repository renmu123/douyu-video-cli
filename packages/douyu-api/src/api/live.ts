import crypto from "node:crypto";
// @ts-ignore
import safeEval from "safe-eval";

import requester from "../request.js";

/**
 * 获取直播间相关信息
 */
export async function getRoomInfo(roomId: number): Promise<{
  room: {
    /** 主播id */
    up_id: string;
    /** 主播昵称 */
    nickname: string;
    /** 主播头像 */
    avatar: {
      big: string;
      middle: string;
      small: string;
    };
    /** 直播间标题 */
    room_name: string;
    /** 直播间封面 */
    room_pic: string;
    /** 直播间号 */
    room_id: number;
    /** 直播状态，1是正在直播 */
    status: "1" | string;
    /** 轮播：1是正在轮播 */
    videoLoop: 1 | number;
    /** 开播时间，秒时间戳 */
    show_time: number;
    [key: string]: any;
  };
  [key: string]: any;
}> {
  const response = await requester.get(
    `https://www.douyu.com/betard/${roomId}`
  );

  return response.data;
}
export interface SourceProfile {
  name: string;
  cdn: string;
  isH265: true;
}

export interface StreamProfile {
  name: string;
  rate: number;
  highBit: number;
  bit: number;
  diamondFan: number;
}
interface GetH5PlaySuccessData {
  room_id: number;
  is_mixed: false;
  mixed_live: string;
  mixed_url: string;
  rtmp_cdn: string;
  rtmp_url: string;
  rtmp_live: string;
  client_ip: string;
  inNA: number;
  rateSwitch: number;
  rate: number;
  cdnsWithName: SourceProfile[];
  multirates: StreamProfile[];
  isPassPlayer: number;
  eticket: null;
  online: number;
  mixedCDN: string;
  p2p: number;
  streamStatus: number;
  smt: number;
  p2pMeta: unknown;
  p2pCid: number;
  p2pCids: string;
  player_1: string;
  h265_p2p: number;
  h265_p2p_cid: number;
  h265_p2p_cids: string;
  acdn: string;
  av1_url: string;
  rtc_stream_url: string;
  rtc_stream_config: string;
}

/**
 * 对斗鱼 getH5Play 接口的封装，用于获取获取直播流
 */
export async function getLiveInfo(opts: {
  channelId: string;
  cdn?: string;
  rate?: number;
}): Promise<GetH5PlaySuccessData> {
  const sign = await getSignFn(opts.channelId);
  // const did = uuid4().replace(/-/g, "");
  const did = "d6122a55e9f2d9ff39d9092800001701";
  const time = Math.ceil(Date.now() / 1000);
  const signedStr = String(sign(opts.channelId, did, time));

  // @ts-ignore
  const signed = queryString.parse(signedStr) as Record<string, string>;

  const res = await requester.post<
    | {
        data: GetH5PlaySuccessData;
        error: number;
        msg: string;
      }
    | string
  >(
    `https://www.douyu.com/lapi/live/getH5Play/${opts.channelId}`,
    new URLSearchParams({
      ...signed,
      cdn: opts.cdn ?? "",
      rate: String(opts.rate ?? 0),
    })
  );
  if (typeof res.data === "string") {
    throw new Error(res.data);
  }
  return res.data.data;
}

const disguisedNativeMethods = new Proxy(
  {},
  {
    get: function () {
      return "function () { [native code] }";
    },
  }
);

async function getSignFn(
  address: string
): Promise<(channelId: string, did: string, time: number) => string> {
  const res = await requester.get(
    "https://www.douyu.com/swf_api/homeH5Enc?rids=" + address
  );
  const json = res.data;
  if (json.error !== 0) throw new Error("Unexpected error code, " + json.error);
  const code = json.data && json.data["room" + address];
  if (!code)
    throw new Error(
      "Unexpected result with homeH5Enc, " + JSON.stringify(json)
    );
  const sign = safeEval(
    `(function func(a,b,c){${code};return ub98484234(a,b,c)})`,
    {
      CryptoJS: {
        MD5: (str: string) => {
          return crypto.createHash("md5").update(str).digest("hex");
        },
      },
      window: disguisedNativeMethods,
      document: disguisedNativeMethods,
    }
  );

  return sign;
}

export async function parseRoomId(url: string): Promise<string | null> {
  if (!/https?:\/\/(?:.*?\.)?douyu.com\//.test(url)) return null;

  url = url.trim();
  // 从 URL 参数中获取 rid
  const rid = new URL(url).searchParams.get("rid");
  if (rid) {
    return rid;
  }

  const res = await requester.get(url);
  const html = res.data;
  // 从页面脚本中提取 room_id
  const matched = html.match(/\$ROOM\.room_id.?=(.*?);/);
  if (matched) {
    const roomId = matched[1].trim();
    return roomId ? roomId : null;
  }

  // 从 canonical link 中提取 roomId
  const canonicalLink = html.match(/<link rel="canonical" href="(.*?)"/);
  if (canonicalLink) {
    const canonicalUrl = canonicalLink[1];
    const roomId = canonicalUrl.split("/").pop();
    return roomId ? roomId : null;
  }

  return null;
}
