import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

/**
 * 通用重试封装。
 * @param {Function} fn - 需要重试的异步函数。
 * @param {object} opts - 配置项。
 * @param {number} [opts.maxRetries=3] - 最大重试次数。
 * @param {number} [opts.delay=1000] - 重试间隔（毫秒）。
 * @param {string} [opts.errorPrefix='请求失败'] - 错误消息前缀。
 * @param {boolean} [opts.softFail=false] - 若为 true，最终失败时返回 'fetch_failed' 而非抛出异常。
 * @returns {Promise<any>}
 */
export async function withRetry(fn, opts = {}) {
    const { maxRetries = 3, delay = 1000, errorPrefix = '请求失败', softFail = false } = opts;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (process.env.NODE_ENV === 'development') {
                console.error(`[RETRY] ${errorPrefix} (尝试 ${attempt}/${maxRetries}):`, error.message);
            }
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // 所有重试都失败
    if (softFail) {
        return 'fetch_failed';
    }

    if (lastError?.code === 'ECONNABORTED') {
        throw new McpError(ErrorCode.InternalError, "请求超时，请稍后重试");
    }
    throw new McpError(ErrorCode.InternalError, `${errorPrefix}: ${lastError?.message || "未知网络错误"}`);
}
