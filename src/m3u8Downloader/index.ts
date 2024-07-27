import fs from "fs-extra";
import path from "node:path";

import axios from "axios";
import axiosRetry from "axios-retry";

import { EventEmitter } from "events";
import PQueue from "p-queue";
import { exec } from "child_process";
import * as m3u8Parser from "m3u8-parser";

// http://play2-tx-recpub.douyucdn2.cn/live/1440p60a_live-93589rLwddnkoZwx--20240727132643/playlist.m3u8?tlink=66a4c6bb&tplay=66a5535b&exper=0&nlimit=5&us=d6122a55e9f2d9ff39d9092800001701&sign=3e40bc9366e5fbce6cb07c7bfc008c7d&u=0&d=d6122a55e9f2d9ff39d9092800001701&ct=web&vid=41710087&pt=2&cdn=tx

export default class M3U8Downloader extends EventEmitter {
  private m3u8Url: string;
  private outputDir: string;
  private queue: PQueue;
  private totalSegments: number;
  private downloadedSegments: number;
  private isPaused: boolean;

  constructor(m3u8Url: string, outputDir: string, concurrency: number = 5) {
    super();
    this.m3u8Url = m3u8Url;
    this.outputDir = outputDir;
    this.queue = new PQueue({ concurrency });
    this.totalSegments = 0;
    this.downloadedSegments = 0;
    this.isPaused = false;

    axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });
  }

  public async download() {
    try {
      this.emit("start");
      if (!(await fs.pathExists(this.outputDir))) {
        await fs.mkdir(this.outputDir);
      }
      const m3u8Content = await this.downloadM3U8();
      const tsUrls = this.parseM3U8(m3u8Content);
      console.log(tsUrls.length);
      this.totalSegments = tsUrls.length;

      // await this.downloadTsSegments(tsUrls);
      // this.mergeTsSegments(tsUrls);

      // this.convertToMp4();

      this.emit("complete");
    } catch (error) {
      this.emit("error", error);
    }
  }

  public pause() {
    this.queue.pause();
    this.isPaused = true;
    this.emit("paused");
  }

  public resume() {
    this.queue.start();
    this.isPaused = false;
    this.emit("resumed");
  }

  async downloadM3U8(): Promise<string> {
    try {
      const { data: m3u8Content } = await axios.get(this.m3u8Url);
      return m3u8Content;
    } catch (error) {
      this.emit("error", "Failed to download m3u8 file");
      throw error;
    }
  }

  parseM3U8(m3u8Content: string): string[] {
    const baseUrl = this.m3u8Url.substring(
      0,
      this.m3u8Url.lastIndexOf("/") + 1
    );
    return m3u8Content
      .split("\n")
      .filter(line => line && !line.startsWith("#"))
      .map(line => (line.startsWith("http") ? line : baseUrl + line));
  }

  private async downloadTsSegments(tsUrls: string[]) {
    const downloadSegment = async (tsUrl: string, index: number) => {
      try {
        const response = await axios.get(tsUrl, {
          responseType: "arraybuffer",
        });
        const segmentPath = path.resolve(this.outputDir, `segment${index}.ts`);
        fs.writeFileSync(segmentPath, response.data);
        this.downloadedSegments++;
        this.emit("progress", this.downloadedSegments, this.totalSegments);
        this.emit("segmentDownloaded", index, tsUrls.length);
      } catch (error) {
        this.emit("error", `Failed to download segment ${index}`);
        throw error;
      }
    };

    for (const [index, tsUrl] of tsUrls.entries()) {
      this.queue
        .add(() => downloadSegment(tsUrl, index))
        .catch(error =>
          this.emit("error", `Failed to add segment ${index} to queue`)
        );
    }

    await this.queue.onIdle();
  }

  private mergeTsSegments(tsUrls: string[]) {
    const mergedFilePath = path.resolve(this.outputDir, "output.ts");
    const writeStream = fs.createWriteStream(mergedFilePath);

    tsUrls.forEach((_, index) => {
      const segmentPath = path.resolve(this.outputDir, `segment${index}.ts`);
      if (fs.existsSync(segmentPath)) {
        const segmentData = fs.readFileSync(segmentPath);
        writeStream.write(segmentData);
        fs.unlinkSync(segmentPath); // 删除临时 TS 片段文件
      } else {
        this.emit("error", `Segment ${index} is missing`);
      }
    });

    writeStream.end();
  }

  private convertToMp4() {
    const inputFilePath = path.resolve(this.outputDir, "output.ts");
    const outputFilePath = path.resolve(this.outputDir, "output.mp4");

    exec(
      `ffmpeg -i ${inputFilePath} -c copy ${outputFilePath}`,
      (error, stdout, stderr) => {
        if (error) {
          this.emit("error", `Failed to convert to MP4: ${stderr}`);
          return;
        }
        fs.unlinkSync(inputFilePath); // 删除临时 TS 文件
        this.emit("converted", outputFilePath);
      }
    );
  }
}
