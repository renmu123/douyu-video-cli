#!/usr/bin/env node
import path from "node:path";
import fs from "fs-extra";

import { Command } from "commander";
import type { Logger } from "winston";

import { version } from "../../package.json";
import up from "../core/up";
import { downloadVideos, saveDanmu } from "../core/index";
import { appPath, readConfig, writeConfig } from "../core/config";
import logger from "../utils/log";

import type { DownloadOptions } from "../types/index";

declare global {
  var logger: Logger;
}
global.logger = logger;
process.on("uncaughtException", err => {
  logger.error(err);
});

const program = new Command();
program.name("douyu").description("斗鱼视频命令行").version(version);

program
  .command("download [url]")
  .description("下载视频")
  .option("--all", "下载所有分p")
  .option("-d, --danmaku", "下载弹幕")
  .option("-r, --rewrite", "覆盖已有文件")
  .action(
    async (
      url,
      opts: {
        all?: boolean;
        danmaku?: boolean;
        rewrite?: boolean;
      }
    ) => {
      const downloader = await downloadVideos(url, opts);
    }
  );

const subscribeSubCommand = program
  .command("subscribe")
  .alias("sub")
  .description("订阅");

subscribeSubCommand
  .command("download")
  .description("下载订阅")
  .option("-f, --force", "强制下载，忽略验证")
  .option("--all", "下载所有分p")
  .option("-d, --danmaku", "下载弹幕")
  .action(
    async (
      options: DownloadOptions & {
        force?: boolean;
      }
    ) => {
      const config = await readConfig();
      logger.info(`开始下载订阅，视频将会被保存在${config.downloadPath}文件中`);
      // subscribe(options);
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
  .description("定时运行sub命令，默认十分钟运行一次")
  .option(
    "-i, --interval <number>",
    "时间间隔，单位分钟，默认10，请勿调整过低，以免撞上风控"
  )
  .option("--all", "下载所有分p")
  .option("-d, --danmaku", "下载弹幕")
  .action(
    async (
      options: DownloadOptions & {
        interval?: number;
      }
    ) => {
      let interval = 10;

      if (options.interval) {
        if (Number.isNaN(Number(options.interval))) {
          console.error("时间间隔必须是数字");
          return;
        } else {
          interval = Number(options.interval);
        }
      }

      // subscribe(options);
      // setInterval(() => {
      //   try {
      //     subscribe(options);
      //   } catch (err) {
      //     logger.error(err.message);
      //   }
      // }, 1000 * 60 * interval);
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
  .action(async (key: string, value: string) => {
    // @ts-ignore
    writeConfig(key, value);
  });

program
  .command("dm")
  .description("下载弹幕")
  .argument("<vid>", "vid")
  .requiredOption("-o, --output <string>", "输出文件")
  .action(async (vid, opts: any) => {
    const data = await saveDanmu(vid, opts.output);
    // console.log(data, data.length);
    // fs.writeJSON(opts.output, data);
  });

program.parse();
