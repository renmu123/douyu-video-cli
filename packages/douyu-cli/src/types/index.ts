export interface Config {
  upList: {
    roomId: number;
    name: string;
    upId: string;
    fishBarId: number;
  }[];
  downloadPath: string;
  ffmpegBinPath: string;
  logLevel: string;
}
