#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command, Option } from "commander";
import up from "./core/up.js";
import { downloadVideos, subscribe } from "./core/index.js";
import { readConfig, writeConfig } from "./core/config.js";
import { parseVideoId } from "./utils/index.js";
import logger from "./utils/log.js";

import type { Logger } from "winston";
import type { Config } from "./types/index.js";
import { streamType } from "douyu-api";

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8")
);

declare global {
  var logger: Logger;
}
global.logger = logger;
process.on("uncaughtException", err => {
  logger.error(err);
});

const program = new Command();

program.name("douyu").description("斗鱼视频下载命令行").version(pkg.version);

program
  .command("download [url]")
  .description("下载视频")
  .option("-a, --all", "下载所有分p")
  .option("-d, --danmaku", "下载弹幕")
  .option("--dir <string>", "下载目录")
  .option("-st, --stream-type <string>", "清晰度，默认为最高清晰度")
  .option("-w, --webhook", "使用webhook")
  .option("--url", "webhook地址", "http://127.0.0.1:18010/webhook/custom")
  .addOption(new Option("-nv, --no-video", "不下载视频").conflicts("webhook"))
  .option("-ffpath, --ffmpeg-bin-path <string>", "ffmpeg路径")
  .option("-conc, --concurrency <number>", "下载并发数", parseFloat, 10)
  .action(
    async (
      url,
      opts: {
        all?: boolean;
        danmaku?: boolean;
        streamType?: streamType;
        dir?: string;
        webhook?: boolean;
        url?: string;
        video?: boolean;
        ffmpegBinPath?: string;
        concurrency?: number;
      }
    ) => {
      const videoId = parseVideoId(url);
      const config = await readConfig();
      opts.dir = opts.dir ?? config.downloadPath;
      opts.ffmpegBinPath = opts.ffmpegBinPath ?? config.ffmpegBinPath;
      opts.concurrency = opts.concurrency || 10;
      const downloader = await downloadVideos(videoId, opts);
    }
  );

const subscribeSubCommand = program
  .command("subscribe")
  .alias("sub")
  .description("订阅");

subscribeSubCommand
  .command("download")
  .description("下载订阅")
  .option("-d, --danmaku", "下载弹幕")
  .option("-st, --stream-type <string>", "清晰度，默认为最高清晰度")
  .option("--dir <string>", "下载目录")
  .option("-w, --webhook", "使用webhook")
  .option(
    "--url <string>",
    "webhook地址",
    "http://127.0.0.1:18010/webhook/custom"
  )
  .addOption(new Option("-nv, --no-video", "不下载视频").conflicts("webhook"))
  .option("-ffpath, --ffmpeg-bin-path <string>", "ffmpeg路径")
  .option("-conc, --concurrency <number>", "下载并发数", parseFloat, 10)
  .action(
    async (options: {
      force?: boolean;
      danmaku?: boolean;
      webhook?: boolean;
      url?: string;
      streamType?: streamType;
      dir?: string;
      video?: boolean;
      ffmpegBinPath?: string;
      concurrency?: number;
    }) => {
      // TODO:模板支持
      const config = await readConfig();
      options.dir = options.dir ?? config.downloadPath;
      options.ffmpegBinPath = options.ffmpegBinPath ?? config.ffmpegBinPath;
      options.concurrency = options.concurrency || 10;
      logger.info(`开始下载订阅，视频将会被保存在${options.dir}文件中`);
      subscribe(options);
    }
  );

subscribeSubCommand
  .command("add")
  .description("添加一个主播到订阅")
  .argument("<number>", "roomId")
  .action((roomId: number) => {
    up.subscribe(Number(roomId));
  });

subscribeSubCommand
  .command("remove")
  .description("移除一个订阅的主播")
  .argument("<number>", "roomId")
  .action((roomId: string) => {
    up.unSubscribe(Number(roomId));
  });

subscribeSubCommand
  .command("list")
  .description("显示所有订阅")
  .action(async () => {
    const data = (await up.list()).map(item => {
      return { roomId: item.roomId, name: item.name };
    });
    console.table(data);
  });

subscribeSubCommand
  .command("server")
  .description("定时运行sub命令")
  .option(
    "-i, --interval <number>",
    "时间间隔，单位分钟，默认60分钟",
    parseFloat,
    60
  )
  .option("-d, --danmaku", "下载弹幕")
  .option("-st, --stream-type <string>", "清晰度，默认为最高清晰度")
  .option("--dir <string>", "下载目录")
  .option("-w, --webhook", "使用webhook")
  .option(
    "--url <string>",
    "webhook地址",
    "http://127.0.0.1:18010/webhook/custom"
  )
  .addOption(new Option("-nv, --no-video", "不下载视频").conflicts("webhook"))
  .option("-ffpath, --ffmpeg-bin-path <string>", "ffmpeg路径")
  .option("-conc, --concurrency <number>", "下载并发数", parseFloat, 10)
  .action(
    async (options: {
      interval?: number;
      danmaku?: boolean;
      webhook?: boolean;
      url?: string;
      video?: boolean;
      ffmpegBinPath?: string;
      concurrency?: number;
      dir?: string;
    }) => {
      let interval = 60;
      const config = await readConfig();
      options.ffmpegBinPath = options.ffmpegBinPath ?? config.ffmpegBinPath;
      options.concurrency = options.concurrency || 10;
      options.interval = options.interval || 60;
      options.dir = options.dir ?? config.downloadPath;

      subscribe(options);
      setInterval(async () => {
        try {
          const config = await readConfig();
          options.ffmpegBinPath = options.ffmpegBinPath || config.ffmpegBinPath;
          options.dir = options.dir ?? config.downloadPath;
          subscribe(options);
        } catch (err) {
          logger.error(err.message);
        }
      }, 1000 * 60 * interval);
    }
  );

const configSubCommand = program.command("config").description("配置项");
configSubCommand
  .command("print")
  .description("显示配置项")
  .action(async () => {
    const config = await readConfig();
    console.info(config);
  });

configSubCommand
  .command("set")
  .description("设置配置项")
  .argument("<string>", "key")
  .argument("<string>", "value")
  .action(async <K extends keyof Config>(key: K, value: Config[K]) => {
    writeConfig(key, value);
  });

// program
//   .command("dm")
//   .description("下载弹幕")
//   .argument("<vid>", "vid")
//   .requiredOption("-o, --output <string>", "输出文件")
//   .action(async (vid, opts: any) => {
//     const data = await saveDanmu(vid, opts.output);
//   });

program.parse();
