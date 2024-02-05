import fs from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
// @ts-ignore
import HLSDownloader from "hlsdownloader";
import { m3u8DLN } from "m3u8-dln";
import { XMLBuilder } from "fast-xml-parser";

import type { DanmuItem } from "../types/index";

export function sanitizeFileName(fileName: string) {
  // 定义不允许出现在文件名中的字符
  const invalidChars = ["/", "\\", ":", "*", "?", '"', "<", ">", "|"];

  // 替换不允许的字符为空格
  const sanitizedFileName = fileName.replace(
    new RegExp("[" + invalidChars.join("") + "]", "g"),
    " "
  );

  return sanitizedFileName;
}

export const downloadFile = async (
  url: string,
  filePath: string,
  options: RequestInit
) => {
  const res = await fetch(url, options);
  const fileStream = fs.createWriteStream(filePath, { flags: "wx" });
  await finished(Readable.fromWeb(res.body).pipe(fileStream));
};

export const downloadHLS = async (
  url: string,
  filePath: string,
  options?: {
    concurrency?: number;
    overwrite?: boolean;
    retry: { limit: number };
  }
) => {
  const downloader = new HLSDownloader({
    playlistURL: url,
    destination: filePath,
    ...options,
  });
  return downloader.startDownload();
};

export const downloadM3u8 = async (url: string, filePath: string) => {
  return m3u8DLN(url, filePath);
};

/**
 * 解析视频id
 */
export const parseVideoId = (url: string) => {
  const u = new URL(url);
  return u.pathname.split("/").pop();
};

/**
 * 转换弹幕为b站格式xml
 * @link: https://socialsisteryi.github.io/bilibili-API-collect/docs/danmaku/danmaku_xml.html#%E5%B1%9E%E6%80%A7-p
 */
export function convert2Xml(data: DanmuItem[]) {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@@",
    format: true,
  });
  // 弹幕颜色
  //   [{
  //     type: 0,
  //     color: "#FFFFFF"
  // }, {
  //     type: 7,
  //     color: "#FF5654"
  // }, {
  //     type: 8,
  //     color: "#FF7523"
  // }, {
  //     type: 9,
  //     color: "#FE69B3"
  // }, {
  //     type: 10,
  //     color: "#FFBC00"
  // }, {
  //     type: 11,
  //     color: "#78C946"
  // }, {
  //     type: 12,
  //     color: "#9E7FFF"
  // }, {
  //     type: 13,
  //     color: "#3D9BFF"
  // }]
  const elems = data.map(ele => {
    const data = {
      "@@p": "",
      "@@progress": String(ele.tl / 1000),
      "@@mode": String(1),
      "@@fontsize": String(25),
      "@@color": String(16777215), // 白色
      "@@midHash": String(ele.mid),
      "#text": String(ele.ctt),
      "@@ctime": String(ele.sts),
      "@@pool": String(0),
      "@@weight": String(0),
      "@@idStr": String(ele.vid),
    };
    data["@@p"] = [
      data["@@progress"],
      data["@@mode"],
      data["@@fontsize"],
      data["@@color"],
      data["@@ctime"],
      data["@@pool"],
      data["@@midHash"],
      data["@@idStr"],
      data["@@weight"],
    ].join(",");
    return data;
  });
  const xmlContent = builder.build({
    i: {
      d: elems,
    },
  });
  return `
<?xml version="1.0" encoding="utf-8"?>
${xmlContent}`;
}
