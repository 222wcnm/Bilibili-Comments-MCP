import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { getValidCookie, validateDynamicId } from '../utils/cookie.js';
import { getApiErrorMessage } from '../utils/common.js';
import { generateDynamicMarkdown } from '../formatters/markdown.js';
import { generateJsonResponse } from '../formatters/json.js';

/**
 * `get_dynamic_comments` 工具的核心执行函数。
 * @param {object} args - 从 LLM 客户端传来的参数。
 * @param {import('../api.js').BilibiliAPI} api - API 实例。
 * @returns {Promise<{content: [{type: string, text: string}]}>}
 */
export async function getDynamicComments(args, api) {
    try {
        const { dynamic_id, page = 1, pageSize = 20, includeReplies = true, outputFormat = "markdown" } = args;
        const cookie = getValidCookie(args.cookie);

        if (!cookie) {
            throw new McpError(ErrorCode.InvalidParams, "必须提供有效的 B 站 Cookie。请通过参数传入或设置 BILIBILI_SESSDATA 环境变量。");
        }
        if (!dynamic_id) throw new McpError(ErrorCode.InvalidParams, "必须提供 dynamic_id");
        if (!validateDynamicId(dynamic_id)) {
            throw new McpError(ErrorCode.InvalidParams, `无效的 dynamic_id 格式: ${dynamic_id}。动态ID应该是长数字字符串。`);
        }
        if (pageSize < 1 || pageSize > 20) throw new McpError(ErrorCode.InvalidParams, "pageSize 必须在 1-20 之间");
        if (page < 1) throw new McpError(ErrorCode.InvalidParams, "page 必须大于等于1");
        if (!["markdown", "json"].includes(outputFormat)) throw new McpError(ErrorCode.InvalidParams, "outputFormat 必须是 markdown 或 json");

        // 获取动态详情，确定正确的评论参数
        const dynamicDetail = await api.getDynamicDetail(dynamic_id, cookie);

        const response = await api.fetchDynamicComments(
            dynamic_id, page, pageSize, cookie,
            dynamicDetail.commentType, dynamicDetail.oid
        );

        if (response.data.code !== 0) {
            let errorMsg = getApiErrorMessage(response.data.code, response.data.message);
            if (response.data.code === -404) {
                errorMsg = "动态不存在或已被删除。请检查 dynamic_id 是否正确，或该动态可能已被作者删除。";
            }
            throw new McpError(ErrorCode.InternalError, `B 站 API 错误 (${response.data.code}): ${errorMsg}`);
        }

        // 构建楼中楼获取函数（使用正确的 oid）
        const fetchRepliesFn = (comment) => api.fetchReplies(dynamicDetail.oid, comment.rpid, cookie, dynamic_id);

        if (outputFormat === "json") {
            const jsonResponse = await generateJsonResponse(response.data.data, includeReplies, fetchRepliesFn);
            return { content: [{ type: "text", text: JSON.stringify(jsonResponse, null, 2) }] };
        } else {
            const markdownResponse = await generateDynamicMarkdown(
                response.data.data, includeReplies, fetchRepliesFn, dynamicDetail.type
            );
            return { content: [{ type: "text", text: markdownResponse }] };
        }
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error(`[ERROR] 获取动态评论失败:`, error);
        }
        return { content: [{ type: "text", text: `❌ 获取动态评论失败: ${error.message}` }] };
    }
}
