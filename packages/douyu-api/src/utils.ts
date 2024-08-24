import { XMLBuilder } from "fast-xml-parser";

import type { DanmuItem } from "./types.js";

/**
 * 转换弹幕为b站格式xml
 * @link: https://socialsisteryi.github.io/bilibili-API-collect/docs/danmaku/danmaku_xml.html#%E5%B1%9E%E6%80%A7-p
 */
export function convert2Xml(
  data: DanmuItem[],
  metadata?: {
    user_name?: string;
    room_id?: string;
    room_title?: string;
    live_start_time?: string;
    video_start_time?: string;
    platform?: "douyu";
  }
) {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@@",
    format: true,
  });
  // 弹幕颜色
  const colorType = [
    {
      type: 0,
      color: "#FFFFFF",
    },
    {
      type: 7,
      color: "#FF5654",
    },
    {
      type: 8,
      color: "#FF7523",
    },
    {
      type: 9,
      color: "#FE69B3",
    },
    {
      type: 10,
      color: "#FFBC00",
    },
    {
      type: 11,
      color: "#78C946",
    },
    {
      type: 12,
      color: "#9E7FFF",
    },
    {
      type: 13,
      color: "#3D9BFF",
    },
  ];
  const colorMap = new Map<number, string>();
  colorType.forEach(ele => {
    colorMap.set(ele.type, ele.color);
  });
  const elems = data.map(ele => {
    const data = {
      "@@p": "",
      "@@progress": String(ele.tl / 1000),
      "@@mode": String(1),
      "@@fontsize": String(25),
      "@@color": String(
        parseInt((colorMap.get(ele.col) || "#ffffff").replace("#", ""), 16)
      ),
      "@@midHash": String(ele.mid),
      "#text": String(ele.ctt),
      "@@ctime": String(ele.sts),
      "@@pool": String(0),
      "@@weight": String(0),
      "@@idStr": String(ele?.uid),
      "@@user": String(ele.nn),
      "@@uid": String(ele?.uid),
    };
    data["@@p"] = [
      data["@@progress"],
      data["@@mode"],
      data["@@fontsize"],
      data["@@color"],
      data["@@ctime"],
      data["@@pool"],
      data["@@midHash"],
      data["@@uid"],
      data["@@weight"],
    ].join(",");
    return data;
  });
  const xmlContent = builder.build({
    i: {
      metadata: metadata,
      d: elems,
    },
  });
  return `
<?xml version="1.0" encoding="utf-8"?>
${xmlContent}`;
}

/**
 * 解析函数名称
 */
export function parseFunctionName(html: string): string[] {
  var functionRegex = /function\s+([a-zA-Z0-9_]+)\(/g;
  var match;
  var functions = [];

  while ((match = functionRegex.exec(html)) !== null) {
    // @ts-ignore
    functions.push(match[1]);
  }

  return functions;
}
/**
 * 解析script标签
 */
export function parseScript(html: string): string[] {
  var scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
  var match;
  var scripts = [];

  while ((match = scriptRegex.exec(html)) !== null) {
    // @ts-ignore
    scripts.push(match[1]);
  }

  return scripts;
}
