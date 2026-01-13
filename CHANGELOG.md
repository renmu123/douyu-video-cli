# 1.0.0

1. api 相关导出移动到`douyu-api`包中
2. 为弹幕元数据增加 `video_start_time` 参数
3. 支持 `start-time`、`end-time`、`start-index`、`end-index` 参数 [#3](https://github.com/renmu123/douyu-video-cli/issues/3)
4. 修复 `dir` 参数错误 [#2](https://github.com/renmu123/douyu-video-cli/pull/2)

# 0.6.3

1. 修复`sub download`无法下载的 bug

# 0.6.2

1. 修复开播时间元数据错误

# 0.6.1

1. 为弹幕增加元数据
2. 修复 ts 转换时内存占用过高的问题

# 0.6.0

1. 更换下载 hls 下载库为`@renmu/m3u8-downloader`
2. 移除`download`的`rewrite`选项
3. 修复老视频无法合并的 bug
4. 更新 [api 文档](./docs/api.md)
5. 修复配置中`ffmpegBinPath`从来没生效过的的 bug
6. 添加了`ffpath`和`conc`选项

# 0.5.0

1. 重构部分代码
2. 导出通用函数

# 0.4.1

1. 弹幕文件`idStr`字段修改为用户 uid
2. 弹幕文件新增`user`用户名字段

# 0.4.0

1. webhook 的默认值修改为`http://127.0.0.1:18010/webhook/custom`

# 0.3.2

1. 修复由于打包引发的 bug

# 0.3.1

1. 修复 webhook url 无法配置的 bug

# 0.3.0

1. 添加下载进度条
2. 使用 safe-eval 获取加密参数

# 0.2.0

1. 增加不下载视频选项

# 0.1.2

## Bug Fix

1. 修复下载失败后未中止后续操作

# 0.1.0

斗鱼视频下载订阅
