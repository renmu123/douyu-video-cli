# API 文档

## 安装

```bash
npm i douyu-api
```

## 使用

```ts
import { getVideoDanmu, getStreamUrls, getVideos, parseVideo } from "douyu-api";
```

## 函数列表

### `getDanmu`

获取原始视频弹幕，如果你想获取完整视频弹幕，推荐直接使用下一个`getVideoDanmu`函数

**参数:**

- `vid` (string): 视频 ID
- `startTime` (number): 开始时间
- `endTime` (number, 可选): 结束时间，默认为 -1

**返回:**

- `Promise<any>`: 弹幕数据

### `getVideoDanmu`

获取视频所有弹幕，如果你想转为 b 站兼容的弹幕格式，使用`convert2Xml`函数

**参数:**

- `vid` (string): 视频 ID

**返回:**

- `Promise<DanmuItem[]>`: 弹幕项列表

### `parseVideo`

解析视频页。

**参数:**

- `url` (string): 视频 URL

**返回:**

- `Promise<Video>`: 视频数据

### `getVideos`

获取所有分 p 视频。

**参数:**

- `videoId` (string): 视频 ID
- `upId` (string): 上传者 ID

**返回:**

- `Promise<object>`: 视频列表数据

### `getStreamUrls`

获取视频流。

**参数:**

- `data` (string): 请求数据，使用`parseVideo`返回的`decodeData`参数

**返回:**

- `Promise<object>`: 视频流数据

### `getReplayList`

获取回放视频列表。

**参数:**

- `params` (object): 请求参数
  - `up_id` (string): 上传者 ID
  - `page` (number): 页码
  - `limit` (number): 每页数量

**返回:**

- `Promise<object>`: 回放视频列表数据

### `getRoomInfo`

获取直播间信息。

**参数:**

- `roomId` (number): 直播间 ID

**返回:**

- `Promise<object>`: 直播间信息

### `getFishBarId`

获取鱼吧 ID。

**参数:**

- `roomId` (number): 直播间 ID

**返回:**

- `Promise<number>`: 鱼吧 ID

### `getFishBarVideoList`

获取鱼吧视频列表。

**参数:**

- `params` (object): 请求参数
  - `type` (1 | 2): 类型
  - `group_id` (number): 群组 ID
  - `page` (number): 页码
  - `lastid` (number): 最后一个视频 ID

**返回:**

- `Promise<object>`: 鱼吧视频列表数据
