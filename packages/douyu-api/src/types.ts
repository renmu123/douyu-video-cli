export interface DanmuItem {
  /** 颜色 */
  col: number;
  /** 内容 */
  ctt: string;
  /** 发送人姓名 */
  nn: string;
  /** 视频相对时间 */
  tl: number;
  /** 发送时间戳 */
  sts: number;
  /** mid */
  mid: string;
  /** vid */
  vid: string;
  /** uid */
  uid: string;
}

export interface Video {
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
      title: string;
      start_time: number;
      video_duration: number;
    };
    liveShow: {
      starttime: number;
      showAuthor: string;
      dayStr: string;
      monthStr: string;
    };
  };
  /** 用于获取视频流 */
  decodeData: string;
  seo_title: string;
}

export type streamType =
  | "2160p60a"
  | "2160p60"
  | "1440p60a"
  | "1440p60"
  | "1080p60"
  | "super"
  | "high"
  | "normal";
