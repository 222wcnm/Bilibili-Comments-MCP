import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ErrorCode,
    McpError
} from "@modelcontextprotocol/sdk/types.js";
import { BilibiliAPI } from './api.js';
import { getVideoComments } from './tools/video.js';
import { getDynamicComments } from './tools/dynamic.js';

const VERSION = '2.0.0';

/**
 * @class BilibiliMCPServer
 * @description MCP 服务器的主体实现，负责定义工具和处理请求。
 */
export class BilibiliMCPServer {
    constructor() {
        this.server = new Server(
            { name: "bilibili-comments-tool", version: VERSION },
            { capabilities: { tools: {} } }
        );
        this.api = new BilibiliAPI();
        this.setupToolHandlers();
    }

    /**
     * 设置工具的定义和请求处理逻辑。
     */
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "get_video_comments",
                    description: "获取 B 站视频的评论内容，支持分页、排序和楼中楼回复。注意：需要有效的 B 站 Cookie 才能正常工作。",
                    inputSchema: {
                        type: "object",
                        properties: {
                            bvid: { type: "string", description: "B 站视频 BV 号（与 aid 二选一，必须提供其中之一）" },
                            aid: { type: "string", description: "B 站视频 AV 号（与 bvid 二选一，必须提供其中之一）" },
                            page: { type: "number", default: 1, description: "页码，默认为 1" },
                            pageSize: { type: "number", default: 20, description: "每页数量，范围 1-20，默认 20" },
                            sort: { type: "number", default: 0, description: "排序方式: 0 按时间，1 按热度" },
                            includeReplies: { type: "boolean", default: true, description: "是否包含楼中楼回复" },
                            outputFormat: { type: "string", default: "markdown", description: "输出格式: markdown 或 json" },
                            cookie: { type: "string", description: "B 站 Cookie（可选）。如果已设置环境变量，则无需提供。" }
                        },
                        anyOf: [
                            { required: ["bvid"] },
                            { required: ["aid"] }
                        ]
                    },
                    annotations: { title: "B站视频评论获取", readOnlyHint: true, openWorldHint: false }
                },
                {
                    name: "get_dynamic_comments",
                    description: "获取 B 站动态的评论内容，支持分页和楼中楼回复。注意：需要有效的 B 站 Cookie 才能正常工作。",
                    inputSchema: {
                        type: "object",
                        properties: {
                            dynamic_id: { type: "string", description: "B 站动态 ID" },
                            page: { type: "number", default: 1, description: "页码，默认为 1" },
                            pageSize: { type: "number", default: 20, description: "每页数量，范围 1-20，默认 20" },
                            includeReplies: { type: "boolean", default: true, description: "是否包含楼中楼回复" },
                            outputFormat: { type: "string", default: "markdown", description: "输出格式: markdown 或 json" },
                            cookie: { type: "string", description: "B 站 Cookie（可选）。如果已设置环境变量，则无需提供。" }
                        },
                        required: ["dynamic_id"]
                    },
                    annotations: { title: "B站动态评论获取", readOnlyHint: true, openWorldHint: false }
                }
            ]
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            switch (name) {
                case "get_video_comments":
                    return await getVideoComments(args, this.api);
                case "get_dynamic_comments":
                    return await getDynamicComments(args, this.api);
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `未知的工具: ${name}`);
            }
        });
    }

    /**
     * 校验环境变量和配置。
     */
    validateEnvironment() {
        const hasSessionData = !!process.env.BILIBILI_SESSDATA;
        const isProduction = process.env.NODE_ENV === 'production';

        if (!hasSessionData && isProduction) {
            console.error('⚠️  警告: 生产环境中未设置BILIBILI_SESSDATA环境变量');
        }

        return { hasSessionData, isProduction, version: VERSION };
    }

    /**
     * 启动 MCP 服务器并监听传入的请求。
     */
    async run() {
        const envCheck = this.validateEnvironment();

        const transport = new StdioServerTransport();
        await this.server.connect(transport);

        console.error(`🚀 Bilibili 评论工具已启动 (v${envCheck.version})`);
        console.error(`🔍 环境检查: BILIBILI_SESSDATA - ${envCheck.hasSessionData ? '✅ 已设置' : '❌ 未设置'}`);
        console.error(`🌍 运行模式: ${envCheck.isProduction ? '生产环境' : '开发环境'}`);

        process.on('SIGINT', async () => {
            console.error('📺 正在关闭服务器...');
            await this.server.close();
            process.exit(0);
        });
    }
}
