import path from "node:path";
import os from "node:os";
import fs from "fs-extra";
import { SingleBar } from "cli-progress";
import axios from "axios";
import M3U8Downloader from "@renmu/m3u8-downloader";

import { sanitizeFileName, convert2Xml } from "../utils/index.js";
import {
  getVideoDanmu,
  getStreamUrls,
  getVideos,
  parseVideo,
  getReplayList,
} from "./api.js";
import up from "./up.js";
import { readData, pushData, deleteData, readConfig } from "./config.js";
import logger from "../utils/log.js";

import type { Video, streamType } from "../types/index.js";

interface DownloadOptions {
  danmaku?: boolean;
  webhook?: boolean;
  url?: string;
  streamType?: streamType;
  dir?: string;
  video?: boolean;
  ffmpegBinPath?: string;
  concurrency?: number;
}

/**
 * 下载订阅
 */
export const subscribe = async (options: DownloadOptions) => {
  const upList = await up.list();
  const records = (await readData()).map(item => item.videoId);

  let videoIds: string[] = [];
  for (const up of upList) {
    const replayList = await getReplayList({
      up_id: up.upId,
      page: 1,
      limit: 1,
    });
    for (const replay of replayList.list) {
      for (const video of replay.video_list) {
        const videos = await getVideos(video.hash_id, up.upId);
        videoIds.push(...videos.list.map(item => item.hash_id));
      }
    }
  }
  videoIds = Array.from(new Set(videoIds));
  videoIds = videoIds.filter(id => !records.includes(id));

  for (const videoId of videoIds) {
    await pushData({ videoId });
    try {
      await downloadVideos(videoId, {
        ...options,
        all: false,
      });
    } catch (error) {
      logger.error(`下载视频${videoId}失败`, error);
      await deleteData(videoId);
      throw error;
    }
  }
};

/**
 * 构建视频页链接
 */
const buildVideoUrl = (videoId: string) => {
  return `https://v.douyu.com/show/${videoId}`;
};

/**
 * 下载视频
 */
export const downloadVideos = async (
  videoId: string,
  opts: DownloadOptions & {
    all?: boolean;
  } = {
    all: false,
    danmaku: false,
  }
) => {
  const videoData = await parseVideo(buildVideoUrl(videoId));
  const downloadDir = opts.dir;

  if (opts.all) {
    const res = await getVideos(videoId, videoData.ROOM.up_id);
    for (const video of res.list) {
      const videoData = await parseVideo(buildVideoUrl(video.hash_id));
      const name = sanitizeFileName(video.title);
      const output = path.join(downloadDir, `${name}.mp4`);
      // console.log(JSON.stringify(videoData, null, 2));
      if (opts.webhook && opts.url) {
        await axios.post(opts.url, {
          event: "FileOpening",
          filePath: output,
          roomId: videoData.DATA.content.room_id,
          // time: "2021-05-14T17:52:54.946",
          time: new Date(
            videoData.DATA.content.start_time * 1000
          ).toISOString(),
          title: video.title,
          username: videoData.ROOM.author_name,
        });
      }
      if (opts.video) {
        logger.info(`开始下载视频${output}`);
        await downloadVideo(videoData, output, opts);
      }

      if (opts.danmaku) {
        const danmuOutput = path.join(downloadDir, `${name}.xml`);
        logger.info(`开始下载弹幕：${danmuOutput}`);
        await saveDanmu(video.hash_id, danmuOutput);
      }

      if (opts.webhook && opts.url) {
        await axios.post(opts.url, {
          event: "FileClosed",
          filePath: output,
          roomId: videoData.DATA.content.room_id,
          time: new Date(
            (videoData.DATA.content.start_time +
              Math.floor(videoData.DATA.content.video_duration)) *
              1000
          ).toISOString(),
          title: video.title,
          username: videoData.ROOM.author_name,
        });
      }
    }
  } else {
    const name = sanitizeFileName(videoData.ROOM.name);
    let output = path.join(downloadDir, `${name}.mp4`);
    if (!opts.ffmpegBinPath) {
      output = path.join(downloadDir, `${name}.ts`);
    }

    if (opts.webhook && opts.url) {
      await axios.post(opts.url, {
        event: "FileOpening",
        filePath: output,
        roomId: videoData.DATA.content.room_id,
        time: new Date(videoData.DATA.content.start_time * 1000).toISOString(),
        title: name,
        username: videoData.ROOM.author_name,
      });
    }
    if (opts.video) {
      logger.info(`开始下载视频：${output}`);
      await downloadVideo(videoData, output, opts);
    }

    if (opts.danmaku) {
      const danmuOutput = path.join(
        downloadDir,
        `${sanitizeFileName(videoData.ROOM.name)}.xml`
      );
      logger.info(`开始下载弹幕：${danmuOutput}`);
      await saveDanmu(videoId, danmuOutput);
    }
    if (opts.webhook && opts.url) {
      await axios.post(opts.url, {
        event: "FileClosed",
        filePath: output,
        roomId: videoData.DATA.content.room_id,
        time: new Date(
          (videoData.DATA.content.start_time +
            Math.floor(videoData.DATA.content.video_duration)) *
            1000
        ).toISOString(),
        title: name,
        username: videoData.ROOM.author_name,
      });
    }
  }
};

/**
 * 下载单个视频
 */
export const downloadVideo = async (
  video: Video,
  output: string,
  opts: DownloadOptions
) => {
  if (await fs.pathExists(output)) {
    logger.info(`文件已存在，跳过下载`);
    return;
  }
  const streamUrl = await getStream(video.decodeData, opts.streamType);
  logger.info(`streamUrl: ${streamUrl}`);
  await saveVideo(streamUrl, output, opts);
};

/**
 * 获取最高清晰度的视频流
 */
const getStream = async (data: string, streamType?: streamType) => {
  const res = await getStreamUrls(data);
  const streams = Object.values(res.thumb_video);
  if (streams.length === 0) {
    throw new Error("没有找到视频流");
  }
  if (streamType) {
    const stream = streams.find(item => item.stream_type === streamType);
    if (stream) {
      return stream.url;
    } else {
      throw new Error("没有对应清晰度的流");
    }
  } else {
    streams.sort((a, b) => {
      return b.bit_rate - a.bit_rate;
    });
    return streams[0].url;
  }
};

/**
 * 保存并合并视频流
 */
const saveVideo = async (
  url: string,
  output: string,
  opts: DownloadOptions
) => {
  // 创建进度条实例
  const progressBar = new SingleBar({
    format: "下载进度 |{bar}| {percentage}% | ETA: {eta}s",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
  });
  progressBar.start(100, 0);
  const segmentsDir = path.join(
    path.dirname(output),
    `${path.parse(output).name}-ts`
  );
  try {
    await downloadHLS(
      url,
      output,
      {
        concurrency: opts.concurrency || 10,
        ffmpegPath: opts.ffmpegBinPath,
        segmentsDir,
      },
      data => {
        const percentage = Math.floor((data.downloaded / data.total) * 100);
        progressBar.update(percentage);
      }
    );
  } catch (e) {
    fs.remove(segmentsDir);
    logger.error(`下载失败`, e);
    throw new Error("下载失败");
  }
  fs.remove(segmentsDir);
  progressBar.stop();
  progressBar.update(100);
};

export async function saveDanmu(vid: string, output: string) {
  if (await fs.pathExists(output)) {
    logger.info(`弹幕文件已存在，跳过下载`);
    return;
  }
  const items = await getVideoDanmu(vid);
  await fs.writeFile(output, convert2Xml(items));
  return items;
}

export const downloadHLS = (
  url: string,
  filePath: string,
  options?: {
    concurrency?: number;
    ffmpegPath?: string;
    segmentsDir: string;
  },
  onProgress?: (data: { downloaded: number; total: number }) => void
) => {
  return new Promise((resolve, reject) => {
    const downloader = new M3U8Downloader(url, filePath, {
      ...options,
      mergeSegments: true,
      convert2Mp4: !!options.ffmpegPath,
      clean: false,
    });
    downloader.on("progress", data => {
      onProgress?.(data);
    });
    downloader.on("completed", () => {
      resolve(true);
    });
    downloader.on("error", error => {
      reject(error);
    });

    downloader.download();
  });
};
