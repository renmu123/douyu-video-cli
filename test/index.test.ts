import { describe, it, expect, vi, beforeEach } from "vitest";
import { M3U8Downloader } from "../src/index";
import axios from "axios";
import fs from "fs-extra";
import path from "path";
import PQueue from "p-queue";
import { exec } from "child_process";

vi.mock("axios");
vi.mock("fs-extra");
vi.mock("path");
vi.mock("p-queue");
vi.mock("os");
vi.mock("child_process");

describe("M3U8Downloader", () => {
  let downloader: M3U8Downloader;
  const m3u8Url = "http://example.com/playlist.m3u8";
  const output = "output.mp4";
  const options = {
    concurrency: 5,
    convert2Mp4: true,
    tempDir: "/tmp",
    ffmpegPath: "ffmpeg",
    retries: 3,
  };

  beforeEach(() => {
    downloader = new M3U8Downloader(m3u8Url, output, options);
  });

  it("should initialize with correct properties", () => {
    expect((downloader as any).m3u8Url).toBe(m3u8Url);
    expect(downloader.output).toBe(output);
    expect((downloader as any).tempDir).toBe(options.tempDir);
    expect((downloader as any).options).toEqual(options);
    expect((downloader as any).queue).toBeInstanceOf(PQueue);
  });

  it("should download m3u8 content", async () => {
    const m3u8Content =
      "#EXTM3U\n#EXTINF:10,\nsegment1.ts\n#EXTINF:10,\nsegment2.ts\n";
    axios.get.mockResolvedValue({ data: m3u8Content });

    const result = await downloader.downloadM3U8();
    expect(result).toBe(m3u8Content);
  });

  it("should parse m3u8 content", () => {
    const m3u8Content =
      "#EXTM3U\n#EXTINF:10,\nsegment1.ts\n#EXTINF:10,\nsegment2.ts\n";
    const result = downloader.parseM3U8(m3u8Content);
    expect(result).toEqual([
      "http://example.com/segment1.ts",
      "http://example.com/segment2.ts",
    ]);
  });

  it("should pause and resume the download", () => {
    downloader.pause();
    expect(downloader.isPaused).toBe(true);

    downloader.resume();
    expect(downloader.isPaused).toBe(false);
  });

  it("should handle download errors", async () => {
    axios.get.mockRejectedValue(new Error("Network error"));
    await expect(downloader.downloadM3U8()).rejects.toThrow("Network error");
  });

  it("should merge TS segments", () => {
    const tsUrls = ["segment1.ts", "segment2.ts"];
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(Buffer.from("data"));
    const writeStream = { write: vi.fn(), end: vi.fn() };
    fs.createWriteStream.mockReturnValue(writeStream);

    const result = (downloader as any).mergeTsSegments(tsUrls);
    expect(result).toBe(path.resolve(options.tempDir, "output.ts"));
    expect(writeStream.write).toHaveBeenCalledTimes(2);
    expect(writeStream.end).toHaveBeenCalled();
  });

  it("should convert TS to MP4", () => {
    const tsMediaPath = "temp.ts";
    (downloader as any).convertToMp4(tsMediaPath);
    expect(exec).toHaveBeenCalledWith(
      `"${options.ffmpegPath}" -i "${tsMediaPath}" -c copy "${output}"`,
      expect.any(Function)
    );
  });
});
