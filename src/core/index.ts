import path from "path";
import fs from "fs-extra";

import { mergeM3U8 } from "../utils/ffmpeg";
import {
  downloadHLS,
  parseVideoId,
  sanitizeFileName,
  convert2Xml,
} from "../utils/index";
import { getDanmu, getStreamUrls, getVideos, parseVideo } from "./api";
import { readConfig } from "./config";
import logger from "../utils/log";

import type { DanmuItem } from "../types/index";

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

/**
 * 下载视频
 */
export const downloadVideos = async (
  url: string,
  opts: {
    all?: boolean;
    danmaku?: boolean;
    rewrite?: boolean;
  }
) => {
  const videoId = parseVideoId(url);
  const videoData = await parseVideo(videoId);
  // console.log("parseVideoRes", parseVideoRes);
  const config = await readConfig();
  const downloadDir = config.downloadPath;

  if (opts.all) {
    const res = await getVideos(videoId, videoData.ROOM.up_id);
    for (const video of res.list) {
      const output = path.join(
        downloadDir,
        `${sanitizeFileName(video.title)}.mp4`
      );
      logger.info(`开始下载视频${output}`);
      await downloadVideo(video.hash_id, output, opts.rewrite);

      if (opts.danmaku) {
        const danmuOutput = path.join(
          downloadDir,
          `${sanitizeFileName(video.title)}.xml`
        );
        logger.info(`开始下载弹幕${danmuOutput}`);
        await saveDanmu(video.hash_id, danmuOutput, opts.rewrite);
      }
    }
  } else {
    const output = path.join(
      downloadDir,
      `${sanitizeFileName(videoData.ROOM.name)}.mp4`
    );
    logger.info(`开始下载视频${output}`);
    await downloadVideo(videoId, output, opts.rewrite);

    if (opts.danmaku) {
      const danmuOutput = path.join(
        downloadDir,
        `${sanitizeFileName(videoData.ROOM.name)}.xml`
      );
      logger.info(`开始下载弹幕${danmuOutput}`);
      await saveDanmu(videoId, danmuOutput, opts.rewrite);
    }
  }
};

/**
 * 下载单个视频
 */
export const downloadVideo = async (
  videoId: string,
  output: string,
  rewrite = false
) => {
  if (!rewrite && (await fs.pathExists(output))) {
    logger.info(`文件已存在，跳过下载`);
    return;
  }
  const streamUrl = await getBigestStream(videoId);
  console.log("streamUrl", streamUrl);
  await saveVideo(streamUrl, output);
};

/**
 * 获取最高清晰度的视频流
 */
const getBigestStream = async (videoId: string) => {
  const res = await getStreamUrls(videoId);
  const streams = Object.values(res.thumb_video);
  if (streams.length === 0) {
    throw new Error("没有找到视频流");
  }

  streams.sort((a, b) => {
    return b.bit_rate - a.bit_rate;
  });
  return streams[0].url;
};

/**
 * 保存并合并视频流
 */
const saveVideo = async (url: string, output: string) => {
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

export async function saveDanmu(vid: string, output: string, rewrite = false) {
  if (!rewrite && (await fs.pathExists(output))) {
    logger.info(`文件已存在，跳过下载`);
    return;
  }
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
