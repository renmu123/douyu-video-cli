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
    };
  };
  decode: (videoId: string) => string;
}

export interface Config {
  upList: {
    roomId: number;
    name: string;
    upId: string;
  }[];
  downloadPath: string;
  ffmpegBinPath: string;
  logLevel: string;
}
