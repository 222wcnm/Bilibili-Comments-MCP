# Bilibili-Comments-MCP
一个基于 Model Context Protocol (MCP) 的 B 站视频评论获取工具.

## 快速开始

### 配置客户端（如Claude Desktop客户端）
在 MCP 客户端的配置文件中添加：

```json
{
  "mcpServers": {
    "bilibili-comments": {
      "command": "npx",
      "args": ["-y", "bilibili-comments-mcp"],
      "env": {
        "BILIBILI_SESSDATA": "your_bilibili_sessdata_here"
      }
    }
  }
}
```

## 环境变量

### 配置方式
- `BILIBILI_SESSDATA`：Bilibili Cookie 中的 SESSDATA 值。

  - 获取方式：登录 Bilibili 网站，打开浏览器开发者工具 (F12)，在 Network (网络) 选项卡中刷新页面，找到任意一个 `bilibili.com` 的请求，在 Request Headers 中找到 Cookie，提取 `SESSDATA=xxx` 部分的值。

## 工具功能

### `get_video_comments`
获取 B 站视频评论，支持分页、排序和楼中楼回复。

**参数：**
- `bvid` / `aid` - 视频ID（二选一）
- `page` - 页码，默认1
- `pageSize` - 每页数量（1-20），默认20
- `sort` - 排序：0按时间，1按热度
- `includeReplies` - 是否包含楼中楼回复，默认true
- `outputFormat` - 输出格式：markdown 或 json，默认markdown
- `cookie` - B站Cookie（可选）

**示例（Markdown格式）：**
```javascript
{
  "bvid": "BV1xx411c7mD",
  "page": 1,
  "pageSize": 20,
  "sort": 1,
  "includeReplies": true,
  "outputFormat": "markdown"
}
```

**示例（JSON格式）：**
```javascript
{
  "bvid": "BV1xx411c7mD",
  "page": 1,
  "pageSize": 20,
  "sort": 0,
  "includeReplies": false,
  "outputFormat": "json"
}
```

### `get_dynamic_comments`
获取 B 站动态评论，支持分页和楼中楼回复。

**参数：**
- `dynamic_id` - 动态ID（必需）
- `page` - 页码，默认1
- `pageSize` - 每页数量（1-20），默认20
- `includeReplies` - 是否包含楼中楼回复，默认true
- `outputFormat` - 输出格式：markdown 或 json，默认markdown
- `cookie` - B站Cookie（可选）

**示例：**
```javascript
{
  "dynamic_id": "123456789",
  "page": 1,
  "pageSize": 10,
  "includeReplies": true,
  "outputFormat": "markdown"
}
```

## Cookie 获取

1. 登录 B 站网页版
2. 打开开发者工具 (F12)
3. 切换到 Network 标签
4. 刷新页面，找到任意请求
5. 复制 Request Headers 中的 Cookie 值

## 动态ID获取方法

1. 在B站手机App中打开想要获取评论的动态
2. 点击分享按钮
3. 选择"复制链接"
4. 链接格式通常为：`https://t.bilibili.com/动态ID`
5. 提取链接中的数字部分作为dynamic_id参数

## 常见问题解决

### 动态评论获取失败
- **错误代码-404**: 动态不存在或已被删除，请检查dynamic_id是否正确
- **错误代码-101**: Cookie已过期，请重新获取并更新SESSDATA
- **错误代码-403**: 访问权限不足，某些动态可能需要登录才能查看评论
