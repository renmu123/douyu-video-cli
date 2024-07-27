import { expect, describe, it, beforeEach, afterEach, vi } from "vitest";

import fs from "fs";
import path from "path";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { EventEmitter } from "events";
import PQueue from "p-queue";
import { exec } from "child_process";
import M3U8Downloader from "../src/m3u8Downloader/index.js";

describe("M3U8Downloader", () => {
  // let mockAxios: MockAdapter;

  // beforeEach(() => {
  //   // @ts-ignore
  //   mockAxios = new MockAdapter(axios);
  // });

  // afterEach(() => {
  //   mockAxios.restore();
  // });

  it("test", async () => {
    const m3u8Url =
      "http://play2-tx-recpub.douyucdn2.cn/live/1440p60a_live-93589rLwddnkoZwx--20240727132643/playlist.m3u8?tlink=66a4c6bb&tplay=66a5535b&exper=0&nlimit=5&us=d6122a55e9f2d9ff39d9092800001701&sign=3e40bc9366e5fbce6cb07c7bfc008c7d&u=0&d=d6122a55e9f2d9ff39d9092800001701&ct=web&vid=41710087&pt=2&cdn=tx";
    const downloader = new M3U8Downloader(
      m3u8Url,
      "C:\\Users\\renmu\\Downloads\\video",
      2
    );
    const m3u8Content = await downloader.download();
    // console.log(m3u8Content);
  });

  it("should download and merge segments successfully", async () => {
    const m3u8Url = "http://example.com/playlist.m3u8";
    const outputDir = "/path/to/output";
    const tsUrls = [
      "http://example.com/segment1.ts",
      "http://example.com/segment2.ts",
      "http://example.com/segment3.ts",
    ];

    const m3u8Content = `
      #EXTM3U
      #EXT-X-VERSION:3
      #EXT-X-TARGETDURATION:10
      #EXT-X-MEDIA-SEQUENCE:0
      #EXTINF:10.0,
      segment1.ts
      #EXTINF:10.0,
      segment2.ts
      #EXTINF:10.0,
      segment3.ts
      #EXT-X-ENDLIST
    `;

    const downloadedSegments: string[] = [];

    mockAxios.onGet(m3u8Url).reply(200, m3u8Content);

    mockAxios.onGet(tsUrls[0]).reply(200, "segment1");
    mockAxios.onGet(tsUrls[1]).reply(200, "segment2");
    mockAxios.onGet(tsUrls[2]).reply(200, "segment3");

    const writeStreamSpy = vi.spyOn(fs, "createWriteStream");
    const writeSpy = vi.spyOn(fs.WriteStream.prototype, "write");
    const unlinkSyncSpy = vi.spyOn(fs, "unlinkSync");
    // @ts-ignore
    const execSpy = vi.spyOn(exec, "exec");

    const downloader = new M3U8Downloader(m3u8Url, outputDir, 2);

    downloader.on("segmentDownloaded", (index: number) => {
      downloadedSegments.push(`segment${index}.ts`);
    });

    await downloader.download();

    expect(mockAxios.history.get.length).toBe(4);
    expect(mockAxios.history.get[0].url).toBe(m3u8Url);
    expect(mockAxios.history.get[1].url).toBe(tsUrls[0]);
    expect(mockAxios.history.get[2].url).toBe(tsUrls[1]);
    expect(mockAxios.history.get[3].url).toBe(tsUrls[2]);

    expect(writeStreamSpy).toHaveBeenCalledWith(
      path.resolve(outputDir, "output.ts")
    );
    expect(writeSpy).toHaveBeenCalledTimes(3);
    expect(writeSpy.mock.calls[0][0]).toEqual(Buffer.from("segment1"));
    expect(writeSpy.mock.calls[1][0]).toEqual(Buffer.from("segment2"));
    expect(writeSpy.mock.calls[2][0]).toEqual(Buffer.from("segment3"));

    expect(unlinkSyncSpy).toHaveBeenCalledTimes(3);
    expect(unlinkSyncSpy.mock.calls[0][0]).toBe(
      path.resolve(outputDir, "segment0.ts")
    );
    expect(unlinkSyncSpy.mock.calls[1][0]).toBe(
      path.resolve(outputDir, "segment1.ts")
    );
    expect(unlinkSyncSpy.mock.calls[2][0]).toBe(
      path.resolve(outputDir, "segment2.ts")
    );

    expect(execSpy).toHaveBeenCalledWith(
      `ffmpeg -i ${path.resolve(outputDir, "output.ts")} -c copy ${path.resolve(
        outputDir,
        "output.mp4"
      )}`,
      expect.any(Function)
    );

    expect(downloadedSegments).toEqual([
      "segment0.ts",
      "segment1.ts",
      "segment2.ts",
    ]);
  });

  it("should emit 'error' event when failed to download m3u8 file", async () => {
    const m3u8Url = "http://example.com/playlist.m3u8";
    const outputDir = "/path/to/output";

    mockAxios.onGet(m3u8Url).reply(500);

    const errorSpy = vi.fn();

    const downloader = new M3U8Downloader(m3u8Url, outputDir);

    downloader.on("error", errorSpy);

    await downloader.download();

    expect(errorSpy).toHaveBeenCalledWith("Failed to download m3u8 file");
  });

  it("should emit 'error' event when failed to download segment", async () => {
    const m3u8Url = "http://example.com/playlist.m3u8";
    const outputDir = "/path/to/output";
    const tsUrls = [
      "http://example.com/segment1.ts",
      "http://example.com/segment2.ts",
    ];

    const m3u8Content = `
      #EXTM3U
      #EXT-X-VERSION:3
      #EXT-X-TARGETDURATION:10
      #EXT-X-MEDIA-SEQUENCE:0
      #EXTINF:10.0,
      segment1.ts
      #EXTINF:10.0,
      segment2.ts
      #EXT-X-ENDLIST
    `;

    mockAxios.onGet(m3u8Url).reply(200, m3u8Content);

    mockAxios.onGet(tsUrls[0]).reply(200, "segment1");
    mockAxios.onGet(tsUrls[1]).reply(500);

    const errorSpy = vi.fn();

    const downloader = new M3U8Downloader(m3u8Url, outputDir);

    downloader.on("error", errorSpy);

    await downloader.download();

    expect(errorSpy).toHaveBeenCalledWith("Failed to download segment 1");
  });

  it("should emit 'error' event when segment is missing", async () => {
    const m3u8Url = "http://example.com/playlist.m3u8";
    const outputDir = "/path/to/output";
    const tsUrls = [
      "http://example.com/segment1.ts",
      "http://example.com/segment2.ts",
    ];

    const m3u8Content = `
      #EXTM3U
      #EXT-X-VERSION:3
      #EXT-X-TARGETDURATION:10
      #EXT-X-MEDIA-SEQUENCE:0
      #EXTINF:10.0,
      segment1.ts
      #EXTINF:10.0,
      segment2.ts
      #EXT-X-ENDLIST
    `;

    mockAxios.onGet(m3u8Url).reply(200, m3u8Content);

    mockAxios.onGet(tsUrls[0]).reply(200, "segment1");

    const errorSpy = vi.fn();

    const downloader = new M3U8Downloader(m3u8Url, outputDir);

    downloader.on("error", errorSpy);

    await downloader.download();

    expect(errorSpy).toHaveBeenCalledWith("Segment 1 is missing");
  });

  it("should emit 'complete' event when download is complete", async () => {
    const m3u8Url = "http://example.com/playlist.m3u8";
    const outputDir = "/path/to/output";
    const tsUrls = [
      "http://example.com/segment1.ts",
      "http://example.com/segment2.ts",
    ];

    const m3u8Content = `
      #EXTM3U
      #EXT-X-VERSION:3
      #EXT-X-TARGETDURATION:10
      #EXT-X-MEDIA-SEQUENCE:0
      #EXTINF:10.0,
      segment1.ts
      #EXTINF:10.0,
      segment2.ts
      #EXT-X-ENDLIST
    `;

    mockAxios.onGet(m3u8Url).reply(200, m3u8Content);

    mockAxios.onGet(tsUrls[0]).reply(200, "segment1");
    mockAxios.onGet(tsUrls[1]).reply(200, "segment2");

    const completeSpy = vi.fn();

    const downloader = new M3U8Downloader(m3u8Url, outputDir);

    downloader.on("complete", completeSpy);

    await downloader.download();

    expect(completeSpy).toHaveBeenCalled();
  });

  it("should emit 'start' event when download starts", async () => {
    const m3u8Url = "http://example.com/playlist.m3u8";
    const outputDir = "/path/to/output";

    const m3u8Content = `
      #EXTM3U
      #EXT-X-VERSION:3
      #EXT-X-TARGETDURATION:10
      #EXT-X-MEDIA-SEQUENCE:0
      #EXTINF:10.0,
      segment1.ts
      #EXTINF:10.0,
      segment2.ts
      #EXT-X-ENDLIST
    `;

    mockAxios.onGet(m3u8Url).reply(200, m3u8Content);

    const startSpy = vi.fn();

    const downloader = new M3U8Downloader(m3u8Url, outputDir);

    downloader.on("start", startSpy);

    await downloader.download();

    expect(startSpy).toHaveBeenCalled();
  });

  it("should emit 'paused' event when download is paused", () => {
    const m3u8Url = "http://example.com/playlist.m3u8";
    const outputDir = "/path/to/output";

    const downloader = new M3U8Downloader(m3u8Url, outputDir);

    const pauseSpy = vi.fn();

    downloader.on("paused", pauseSpy);

    downloader.pause();

    expect(pauseSpy).toHaveBeenCalled();
  });

  it("should emit 'resumed' event when download is resumed", () => {
    const m3u8Url = "http://example.com/playlist.m3u8";
    const outputDir = "/path/to/output";

    const downloader = new M3U8Downloader(m3u8Url, outputDir);

    const resumeSpy = vi.fn();

    downloader.on("resumed", resumeSpy);

    downloader.resume();

    expect(resumeSpy).toHaveBeenCalled();
  });

  it("should create output directory if it does not exist", async () => {
    const m3u8Url = "http://example.com/playlist.m3u8";
    const outputDir = "/path/to/output";

    const m3u8Content = `
      #EXTM3U
      #EXT-X-VERSION:3
      #EXT-X-TARGETDURATION:10
      #EXT-X-MEDIA-SEQUENCE:0
      #EXTINF:10.0,
      segment1.ts
      #EXTINF:10.0,
      segment2.ts
      #EXT-X-ENDLIST
    `;

    mockAxios.onGet(m3u8Url).reply(200, m3u8Content);

    const mkdirSyncSpy = vi.spyOn(fs, "mkdirSync");

    const downloader = new M3U8Downloader(m3u8Url, outputDir);

    await downloader.download();

    expect(mkdirSyncSpy).toHaveBeenCalledWith(outputDir, { recursive: true });
  });
});
