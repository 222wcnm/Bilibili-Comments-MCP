import axios from "axios";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { withRetry } from "./utils/retry.js";
import { signParams } from "./utils/wbi.js";

/**
 * @class BilibiliAPI
 * @description 封装所有与 Bilibili API 的网络交互逻辑。
 */
export class BilibiliAPI {
    constructor() {
        this.axiosInstance = axios.create({
            timeout: 15000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Origin": "https://www.bilibili.com"
            }
        });

        this.apiEndpoints = {
            view: "https://api.bilibili.com/x/web-interface/view",
            reply: "https://api.bilibili.com/x/v2/reply",
            replyReply: "https://api.bilibili.com/x/v2/reply/reply",
            dynamicDetail: "https://api.bilibili.com/x/polymer/web-dynamic/v1/detail",
        };
    }

    /**
     * 根据 bvid 获取视频的基本信息（主要是 aid 和标题）。
     * @param {string} bvid - 视频的 BV 号。
     * @param {string} cookie - 用户的 Bilibili Cookie。
     * @returns {Promise<{aid: number, title: string}>}
     */
    async getVideoInfo(bvid, cookie) {
        try {
            const response = await this.axiosInstance.get(this.apiEndpoints.view, {
                params: { bvid },
                headers: {
                    "Cookie": cookie,
                    "Referer": `https://www.bilibili.com/video/${bvid}`,
                },
            });

            if (response.data.code !== 0) {
                throw new McpError(ErrorCode.InternalError, `获取视频信息失败 (${response.data.code}): ${response.data.message}`);
            }

            return { aid: response.data.data.aid, title: response.data.data.title };
        } catch (error) {
            if (error instanceof McpError) throw error;
            throw new McpError(ErrorCode.InternalError, `获取视频信息失败: ${error.message || "未知网络错误"}`);
        }
    }

    /**
     * 获取视频的主评论列表。
     * @param {number} oid - 视频的 aid。
     * @param {number} page - 评论页码。
     * @param {number} pageSize - 每页评论数量。
     * @param {number} sort - 排序方式 (0: 时间, 1: 热度)。
     * @param {string} cookie - 用户的 Bilibili Cookie。
     * @param {string} videoId - 用于 Referer 的视频 ID。
     * @returns {Promise<import('axios').AxiosResponse>}
     */
    async fetchComments(oid, page, pageSize, sort, cookie, videoId) {
        return withRetry(
            async () => {
                const rawParams = { type: 1, oid, pn: page, ps: Math.min(pageSize, 49), sort };
                const signedParams = await signParams(rawParams, cookie);
                return this.axiosInstance.get(this.apiEndpoints.reply, {
                    params: signedParams,
                    headers: { "Cookie": cookie },
                    timeout: 10000,
                });
            },
            { errorPrefix: '获取主评论失败' }
        );
    }

    /**
     * 获取单条主评论下的楼中楼回复。
     * @param {number} oid - 视频的 aid。
     * @param {number} parentRpid - 父评论的 rpid。
     * @param {string} cookie - 用户的 Bilibili Cookie。
     * @param {string} refId - 用于 Referer 的 ID。
     * @returns {Promise<Array<any>|'fetch_failed'>}
     */
    async fetchReplies(oid, parentRpid, cookie, refId) {
        const result = await withRetry(
            async () => {
                const rawParams = { type: 1, oid, root: parentRpid, ps: 10 };
                const signedParams = await signParams(rawParams, cookie);
                const response = await this.axiosInstance.get(this.apiEndpoints.replyReply, {
                    params: signedParams,
                    headers: { "Cookie": cookie },
                    timeout: 8000,
                });

                if (response.data.code === 0 && response.data.data?.replies) {
                    return response.data.data.replies;
                }
                return [];
            },
            { errorPrefix: `获取楼中楼失败 (rpid: ${parentRpid})`, softFail: true }
        );
        return result;
    }

    /**
     * 获取动态详细信息，用于确定正确的评论类型和 oid。
     * @param {string} dynamicId - 动态 ID。
     * @param {string} cookie - 用户的 Bilibili Cookie。
     * @returns {Promise<{type: string, oid: string, commentType: number, originalType: string}>}
     */
    async getDynamicDetail(dynamicId, cookie) {
        try {
            const response = await this.axiosInstance.get(this.apiEndpoints.dynamicDetail, {
                params: { id: dynamicId },
                headers: {
                    "Cookie": cookie,
                    "Referer": `https://t.bilibili.com/${dynamicId}`,
                },
                timeout: 10000,
            });

            if (response.data.code !== 0) {
                throw new McpError(ErrorCode.InternalError, `获取动态详情失败 (${response.data.code}): ${response.data.message}`);
            }

            const item = response.data.data.item;
            const realOid = item?.basic?.comment_id_str || dynamicId;
            const commentType = item?.basic?.comment_type ?? 17;

            const typeMap = {
                'DYNAMIC_TYPE_AV': '视频动态',
                'DYNAMIC_TYPE_DRAW': '图片动态',
                'DYNAMIC_TYPE_WORD': '文字动态',
                'DYNAMIC_TYPE_ARTICLE': '专栏动态',
                'DYNAMIC_TYPE_FORWARD': '转发动态',
            };
            const dynamicType = typeMap[item?.type] || '普通动态';

            return { type: dynamicType, oid: realOid, commentType, originalType: item?.type };
        } catch (error) {
            if (error instanceof McpError) throw error;
            throw new McpError(ErrorCode.InternalError, `获取动态详情失败: ${error.message || "未知网络错误"}`);
        }
    }

    /**
     * 获取动态的主评论列表。
     * @param {string} dynamicId - 动态 ID。
     * @param {number} page - 评论页码。
     * @param {number} pageSize - 每页评论数量。
     * @param {string} cookie - 用户的 Bilibili Cookie。
     * @param {number} commentType - 评论类型。
     * @param {string} oid - 实际的评论对象 ID。
     * @returns {Promise<import('axios').AxiosResponse>}
     */
    async fetchDynamicComments(dynamicId, page, pageSize, cookie, commentType = 17, oid = null) {
        const actualOid = oid || dynamicId;

        return withRetry(
            async () => {
                const rawParams = { type: commentType, oid: actualOid, pn: page, ps: Math.min(pageSize, 49) };
                const signedParams = await signParams(rawParams, cookie);
                return this.axiosInstance.get(this.apiEndpoints.reply, {
                    params: signedParams,
                    headers: { "Cookie": cookie },
                    timeout: 10000,
                });
            },
            { errorPrefix: '获取动态评论失败' }
        );
    }
}
