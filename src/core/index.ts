import path from "path";
import fs from "fs-extra";

import { mergeM3U8 } from "../utils/ffmpeg";
import { downloadHLS } from "../utils/index";
import { getDanmu } from "./api";
import { XMLBuilder } from "fast-xml-parser";

const modifyM3U8 = async (m3u8File: string, outputFile: string) => {
  const data = await fs.readFile(m3u8File);
  const lines: string[] = [];
  data
    .toString()
    .split("\n")
    .forEach((line, index) => {
      if (line.startsWith("transcode_live")) {
        line = line.split("?")[0];
      }
      lines.push(line);
    });

  await fs.writeFile(outputFile, lines.join("\n"));
};

export const downloadVideo = async (url: string, output: string) => {
  const tempDir = `${output}-temp`;

  const hls = await downloadHLS(url, tempDir, {
    retry: { limit: 2 },
    overwrite: false,
  });
  if (hls.error && hls.erroe.length > 0) {
    throw new Error("下载失败");
  }

  const m3u8Path = new URL(url).pathname;
  const m3u8File = `${path.join(tempDir, m3u8Path)}`;
  const m3u8NewFile = `${m3u8File}.new.m3u8`;

  await modifyM3U8(m3u8File, m3u8NewFile);
  console.log("m3u8Path", `${path.join(tempDir, m3u8Path)}`);
  await mergeM3U8(m3u8NewFile, output, []);
  await fs.remove(tempDir);
};

interface DanmuItem {
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

/**
 * 转换弹幕为b站格式xml
 * @link: https://socialsisteryi.github.io/bilibili-API-collect/docs/danmaku/danmaku_xml.html#%E5%B1%9E%E6%80%A7-p
 */
function convert2Xml(data: DanmuItem[]) {
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

export async function getAllDanmu(vid: string, output: string) {
  const items: DanmuItem[] = [];
  let startTime = 0;

  while (startTime !== -1) {
    const res = await getDanmu(vid, startTime);
    startTime = res.data.end_time;
    const list: any[] = res.data.list;
    items.push(...list);
    // console.log("getDanmu", list.length, startTime);
  }
  await fs.writeFile(output, convert2Xml(items));
  return items;
}
