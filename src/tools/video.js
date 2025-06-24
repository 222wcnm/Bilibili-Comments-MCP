import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { getValidCookie } from '../utils/cookie.js';
import { getApiErrorMessage } from '../utils/common.js';
import { generateVideoMarkdown } from '../formatters/markdown.js';
import { generateJsonResponse } from '../formatters/json.js';

/**
 * `get_video_comments` 工具的核心执行函数。
 * @param {object} args - 从 LLM 客户端传来的参数。
 * @param {import('../api.js').BilibiliAPI} api - API 实例。
 * @returns {Promise<{content: [{type: string, text: string}]}>}
 */
export async function getVideoComments(args, api) {
    try {
        const { bvid, aid, page = 1, pageSize = 20, sort = 0, includeReplies = true, outputFormat = "markdown" } = args;
        const cookie = getValidCookie(args.cookie);

        if (!cookie) {
            throw new McpError(ErrorCode.InvalidParams, "必须提供有效的 B 站 Cookie。请通过参数传入或设置 BILIBILI_SESSDATA 环境变量。");
        }
        if (!bvid && !aid) throw new McpError(ErrorCode.InvalidParams, "必须提供 bvid 或 aid 之一");
        if (pageSize < 1 || pageSize > 20) throw new McpError(ErrorCode.InvalidParams, "pageSize 必须在 1-20 之间");
        if (![0, 1].includes(sort)) throw new McpError(ErrorCode.InvalidParams, "sort 必须是 0 或 1");
        if (!["markdown", "json"].includes(outputFormat)) throw new McpError(ErrorCode.InvalidParams, "outputFormat 必须是 markdown 或 json");

        const videoIdForRef = bvid || `av${aid}`;
        let oid = aid;
        if (bvid && !aid) {
            const videoInfo = await api.getVideoInfo(bvid, cookie);
            oid = videoInfo.aid;
        }

        const response = await api.fetchComments(oid, page, pageSize, sort, cookie, videoIdForRef);

        if (response.data.code !== 0) {
            const errorMsg = getApiErrorMessage(response.data.code, response.data.message);
            throw new McpError(ErrorCode.InternalError, `B 站 API 错误 (${response.data.code}): ${errorMsg}`);
        }

        // 构建楼中楼获取函数
        const fetchRepliesFn = (comment) => api.fetchReplies(oid, comment.rpid, cookie, videoIdForRef);

        if (outputFormat === "json") {
            const jsonResponse = await generateJsonResponse(response.data.data, includeReplies, fetchRepliesFn);
            return { content: [{ type: "text", text: JSON.stringify(jsonResponse, null, 2) }] };
        } else {
            const markdownResponse = await generateVideoMarkdown(response.data.data, includeReplies, fetchRepliesFn);
            return { content: [{ type: "text", text: markdownResponse }] };
        }
    } catch (error) {
        return { content: [{ type: "text", text: `❌ 获取评论失败: ${error.message}` }] };
    }
}
