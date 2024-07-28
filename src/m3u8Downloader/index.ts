import os from "node:os";
import fs from "fs-extra";
import path from "node:path";
import { exec } from "node:child_process";
import { EventEmitter } from "node:events";

import axios from "axios";
import axiosRetry from "axios-retry";
import PQueue from "p-queue";

export default class M3U8Downloader extends EventEmitter {
  private m3u8Url: string;
  output: string;
  private tempDir: string;
  private queue: PQueue;
  private totalSegments: number;
  private downloadedSegments: number;
  private isPaused: boolean;
  private isCanceled: boolean;
  private downloadedFiles: string[];
  private options: {
    concurrency: number;
    convert2Mp4: boolean;
    tempDir: string;
    ffmpegPath: string;
    retries: number;
  };

  /**
   * @param m3u8Url M3U8 URL
   * @param options
   * @param options.concurrency Number of segments to download concurrently
   * @param options.tempDir Temporary directory to store downloaded segments
   * @param options.convert2Mp4 Whether to convert2Mp4 downloaded segments into a single file
   * @param options.ffmpegPath Path to ffmpeg binary
   * @param options.retries Number of retries for downloading segments
   */
  constructor(
    m3u8Url: string,
    output: string,
    options: {
      concurrency?: number;
      tempDir?: string;
      convert2Mp4?: boolean;
      ffmpegPath?: string;
      retries?: number;
    } = {}
  ) {
    super();
    const defaultOptions = {
      concurrency: 5,
      convert2Mp4: false,
      tempDir: os.tmpdir(),
      retries: 3,
      ffmpegPath: "ffmpeg",
    };
    this.options = Object.assign(defaultOptions, options);
    this.m3u8Url = m3u8Url;
    this.output = output;
    this.tempDir = this.options.tempDir;
    this.queue = new PQueue({ concurrency: this.options.concurrency });
    this.totalSegments = 0;
    this.downloadedSegments = 0;
    this.isPaused = false;
    this.isCanceled = false;
    this.downloadedFiles = [];

    axiosRetry(axios, {
      retries: this.options.retries,
      retryDelay: axiosRetry.exponentialDelay,
    });

    // 监听取消和错误事件
    this.on("canceled", this.cleanUpDownloadedFiles);
    this.on("error", this.cleanUpDownloadedFiles);
  }

  public async download() {
    try {
      this.emit("start");
      if (!(await fs.pathExists(this.tempDir))) {
        await fs.mkdir(this.tempDir, { recursive: true });
      }
      if (!(await fs.pathExists(path.dirname(this.output)))) {
        throw new Error("Output directory does not exist");
      }
      const m3u8Content = await this.downloadM3U8();
      const tsUrls = this.parseM3U8(m3u8Content);
      this.totalSegments = tsUrls.length;

      await this.downloadTsSegments(tsUrls);
      const tsMediaPath = this.mergeTsSegments(tsUrls);
      if (this.isCanceled) return;

      if (this.options.convert2Mp4) {
        this.convertToMp4(tsMediaPath);
      }

      this.emit("completed");
    } catch (error) {
      this.emit("error", error);
    }
  }

  public pause() {
    if (this.isCanceled) return;

    this.queue.pause();
    this.isPaused = true;
    this.emit("paused");
  }

  public resume() {
    if (this.isCanceled) return;

    this.queue.start();
    this.isPaused = false;
    this.emit("resumed");
  }
  public cancel() {
    this.isCanceled = true;
    this.queue.clear(); // 清空队列中的所有任务
    this.emit("canceled");
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
      if (this.isCanceled) return;

      try {
        const response = await axios.get(tsUrl, {
          responseType: "arraybuffer",
        });
        const segmentPath = path.resolve(this.tempDir, `segment${index}.ts`);
        await fs.writeFile(segmentPath, response.data);
        this.downloadedFiles.push(segmentPath);
        this.downloadedSegments++;
        this.emit("progress", {
          downloaded: this.downloadedSegments,
          total: this.totalSegments,
        });
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
    if (this.isCanceled) return;
    let mergedFilePath = path.resolve(this.tempDir, "output.ts");

    if (!this.options.convert2Mp4) {
      mergedFilePath = this.output;
    }
    const writeStream = fs.createWriteStream(mergedFilePath);

    tsUrls.forEach((_, index) => {
      if (this.isCanceled) return;

      const segmentPath = path.resolve(this.tempDir, `segment${index}.ts`);
      if (fs.existsSync(segmentPath)) {
        const segmentData = fs.readFileSync(segmentPath);
        writeStream.write(segmentData);
        fs.unlinkSync(segmentPath); // 删除临时 TS 片段文件
      } else {
        this.emit("error", `Segment ${index} is missing`);
      }
    });

    writeStream.end();
    return mergedFilePath;
  }
  private async cleanUpDownloadedFiles() {
    await Promise.all(
      this.downloadedFiles.map(async file => {
        if (await fs.pathExists(file)) {
          await fs.unlink(file);
        }
      })
    );
    if (this.options.convert2Mp4) {
      let mergedFilePath = path.resolve(this.tempDir, "output.ts");
      if (await fs.pathExists(mergedFilePath)) {
        await fs.unlink(mergedFilePath);
      }
    }
    this.downloadedFiles = [];
  }

  private convertToMp4(tsMediaPath: string) {
    const inputFilePath = tsMediaPath;
    const outputFilePath = this.output;

    exec(
      `"${this.options.ffmpegPath}" -i "${inputFilePath}" -c copy "${outputFilePath}"`,
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
