import { spawn } from "node:child_process";

/**
 * 合并m3u8
 */
export function mergeM3U8(
  input: string,
  outputFilepath: string,
  exArgs: string[] = [],
  ffmpegBinPath = "ffmpeg"
) {
  return new Promise((resolve, reject) => {
    let args = ["-hide_banner", "-loglevel", "error"];

    args = [
      ...args,
      "-i",
      input,
      "-c",
      "copy",
      ...exArgs,
      "-y",
      outputFilepath,
    ];
    // console.log(`${ffmpegBinPath} ${args.join(" ")}`);
    const ffmpeg = spawn(ffmpegBinPath, args);

    ffmpeg.stdout.pipe(process.stdout);

    ffmpeg.stderr.pipe(process.stderr);

    ffmpeg.on("close", code => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(false);
      }
    });
  });
}
