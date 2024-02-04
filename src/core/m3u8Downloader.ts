import axios from "axios";
import * as m3u8Parser from "m3u8-parser";

import type { AxiosInstance } from "axios";

export default class M3U8Downloader {
  url: string;
  request: AxiosInstance;

  constructor(url: string) {
    console.log("M3U8Downloader");
    this.url = url;

    this.request = axios.create({
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      },
    });
    this.request.interceptors.request.use(config => {
      if (!config.headers.host) {
        const url = new URL(config.url);
        config.headers["host"] = url.hostname;
      }
      return config;
    });
  }
  async downloadVideo(url: string, output: string) {
    console.log("downloadVideo", url, output);
  }

  async parse() {
    console.log("parse", this.url, new URL(this.url).hostname);
    const res = await this.request.get(this.url);
    // console.log("res", res);
    if (res.status !== 200) {
      throw new Error("request error, error code: " + res.status);
    }
    const m3u8 = res.data.split("\n").splice(0, 20).join("\n");
    // console.log("m3u8", m3u8);
    const parser = new m3u8Parser.Parser();

    // parser.addParser({
    //   expression: /^#VOD-FRAMERATE/,
    //   customType: "framerate",
    // });

    parser.push(m3u8);
    parser.end();
    console.log(JSON.stringify(parser, null, 2));
  }
}
