# 简介

用于下载斗鱼视频录播以及弹幕，支持订阅，自动下载，支持调用 [biliLive-tools](https://github.com/renmu123/biliLive-tools) 自动上传。  
[视频简介](https://www.bilibili.com/video/BV1tJ4m1a7GQ/)

**node>=20**

# 安装

`npm install -g douyu-cli`

默认视频为 ts 格式，如果想要转换为 mp4，那么你需要手动安装[`ffmpeg`](https://github.com/BtbN/FFmpeg-Builds/releases)并使用`douyu config set ffmpegBinPath xxxx`设置可执行文件地址，如果你已经设置为环境变量，也可以设置为`ffmpeg`。

# 使用

```bash
Usage: douyu [options] [command]

斗鱼视频下载命令行

Options:
  -V, --version             output the version number
  -h, --help                display help for command

Commands:
  download [options] [url]  下载视频
  subscribe|sub             订阅
  config                    配置项
  help [command]            display help for command
```

## 下载视频

`douyu download https://v.douyu.com/show/yVY8WwdzNyVvLOz9`

你也可以加上`-d`, `-a` 来下载当前视频的所有分 p，并下载弹幕，弹幕为 b 站兼容格式，你可以使用如 [DanmakuFactory](https://github.com/hihkm/DanmakuFactory) 将弹幕转换为 ass 格式进行后续操作。

如果你正在寻找将录播上传到 B 站的工具，可以尝试一下 [biliLive-tools](https://github.com/renmu123/biliLive-tools)，支持将弹幕转换以及压制到视频中并自动上传。

```bash
Usage: douyu download [options] [url]

下载视频

Options:
  -a, --all      下载所有分p
  -d, --danmaku  下载弹幕
  -st, --stream-type 清晰度
  --dir          下载文件夹，会覆盖config中的downloadPath
  -w, -webhook   启用webhook
  --url          webhook地址
  -nv, --no-video 不下载视频
  -h, --help     display help for command
```

清晰度参数，默认为最大清晰度  
大致清晰度供参考：  
原画 2K60：1440p60a  
高清 1080P60：1080p60  
高清 720P：high  
标清 480P：normal

## 订阅

### 添加订阅

`douyu sub add 93589`

### 移除订阅

`douyu sub remove 93589`

### 下载订阅

这个功能会读取订阅主播最近的一次直播回放并进行下载，已下载过的任务不会重复下载。

#### webhook 功能

在视频下载前会发送类似的包给 webhook 服务器：
filePath: 下载完成后的文件地址  
roomId: 房间号
time: 录播视频开始时间戳  
title: 分 p 标题  
username: 用户名

```bash
curl --location 'http://127.0.0.1:18010/webhook/custom' \
--header 'Content-Type: application/json' \
--data '{
    "event":"FileOpening",
    "filePath":"D:\\aa.mp4",
    "roomId": 93589,
    "time":"2021-05-14T17:52:54.946",
    "title":"我是猪",
    "username":"djw"
}'
```

你可以搭配 [biliLive-tools](https://github.com/renmu123/biliLive-tools)（0.9.0 版本及以上） 使用来实现自动压制上传。
如果需要将一天的录播设置为一个分 p，请开启断播续传功能，并将间隔设置为录播间隔往上，建议设置 3 小时以上。

`douyu sub download`

### 定时运行下载订阅任务

默认时间间隔为 60 分钟，斗鱼录播的分隔时间约为 75 分钟，间隔调整为较短大致上也没什么用。

`douyu sub server`

你也可以使用定时任务来执行 `douyu sub download` 命令，可以到达相同的效果

## 配置

### 查看配置

`douyu config print`

### 更新配置

`douyu config set xxx xxx`

## 其他

请善用`help`指令

# 赞赏

如果本项目对你有帮助，请我喝瓶快乐水吧，有助于项目更好维护。  
爱发电：[https://afdian.com/a/renmu123](https://afdian.com/a/renmu123)  
你也可以给我的 B 站帐号[充电](https://space.bilibili.com/10995238)

# 开发

node>=20

如果你需要使用一些相关 api 进行二次开发，参考 [api 文档](./docs/api.md)

## Install

```bash
$ pnpm install
```

## Development

```bash
$ pnpm run dev
```

## Build

```bash
$ pnpm run build
```

# License

GPLv3
