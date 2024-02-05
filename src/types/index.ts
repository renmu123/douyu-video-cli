export interface DownloadOptions {
  all?: boolean;
  cover?: boolean;
  video?: boolean;
  danmaku?: boolean;
  meta?: boolean;
  rewrite?: boolean;
}

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
