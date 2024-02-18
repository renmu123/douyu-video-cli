import path from "path";
import fs from "fs-extra";

import axios from "axios";
import { mergeM3U8 } from "../utils/ffmpeg";
import { downloadHLS, sanitizeFileName, convert2Xml } from "../utils/index";
import {
  getDanmu,
  getStreamUrls,
  getVideos,
  parseVideo,
  getReplayList,
} from "./api";
import up from "./up";
import { readConfig, readData, pushData, deleteData } from "./config";
import logger from "../utils/log";

import type { DanmuItem, Video } from "../types/index";

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
 * 下载订阅
 */
export const subscribe = async (options: {
  danmaku?: boolean;
  webhook?: boolean;
  url?: string;
  streamType?: string;
  dir?: string;
}) => {
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
        rewrite: false,
      });
    } catch (error) {
      logger.error(`下载视频${videoId}失败`, error);
      await deleteData(videoId);
      throw error;
    }
  }
};

/**
 * 下载视频
 */
export const downloadVideos = async (
  videoId: string,
  opts: {
    all?: boolean;
    danmaku?: boolean;
    rewrite?: boolean;
    url?: string;
    webhook?: boolean;
    streamType?: string;
    dir?: string;
  } = {
    all: false,
    danmaku: false,
    rewrite: false,
  }
) => {
  const videoData = await parseVideo(videoId);
  const config = await readConfig();
  const downloadDir = opts.dir ?? config.downloadPath;

  if (opts.all) {
    const res = await getVideos(videoId, videoData.ROOM.up_id);
    for (const video of res.list) {
      const videoData = await parseVideo(video.hash_id);
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

      logger.info(`开始下载视频${output}`);
      await downloadVideo(videoData, output, opts);

      if (opts.danmaku) {
        const danmuOutput = path.join(downloadDir, `${name}.xml`);
        logger.info(`开始下载弹幕：${danmuOutput}`);
        await saveDanmu(video.hash_id, danmuOutput, opts.rewrite);
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
    const output = path.join(downloadDir, `${name}.mp4`);

    if (opts.webhook && opts.url) {
      await axios.post(opts.url, {
        event: "FileOpening",
        filePath: output,
        roomId: videoData.DATA.content.room_id,
        time: "2021-05-14T17:52:54.946",
        title: name,
        username: videoData.ROOM.author_name,
      });
    }
    logger.info(`开始下载视频：${output}`);
    await downloadVideo(videoData, output, opts);

    if (opts.danmaku) {
      const danmuOutput = path.join(
        downloadDir,
        `${sanitizeFileName(videoData.ROOM.name)}.xml`
      );
      logger.info(`开始下载弹幕：${danmuOutput}`);
      await saveDanmu(videoId, danmuOutput, opts.rewrite);
    }
    if (opts.webhook && opts.url) {
      await axios.post(opts.url, {
        event: "FileClosed",
        filePath: output,
        roomId: videoData.DATA.content.room_id,
        time: "2021-05-14T17:52:54.946",
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
  opts: {
    rewrite?: boolean;
    streamType?: string;
  }
) => {
  if (!opts.rewrite && (await fs.pathExists(output))) {
    logger.info(`文件已存在，跳过下载`);
    return;
  }
  const data = video.decode(video.ROOM.vid);
  const streamUrl = await getStream(data, opts.streamType);
  logger.info(`streamUrl: ${streamUrl}`);
  await saveVideo(streamUrl, output);
};

/**
 * 获取最高清晰度的视频流
 */
const getStream = async (data: string, streamType?: string) => {
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
const saveVideo = async (url: string, output: string) => {
  const tempDir = `${output}-temp`;
  const hls = await downloadHLS(url, tempDir, {
    concurrency: 10,
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
  logger.info(`m3u8Path: ${path.join(tempDir, m3u8Path)}`);
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
  }
  await fs.writeFile(output, convert2Xml(items));
  return items;
}
