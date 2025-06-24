/**
 * B 站 API 错误码到用户友好消息的映射。
 */
export const API_ERROR_MAP = {
    '-101': '账号未登录或 Cookie 已过期',
    '-403': '访问权限不足',
    '-404': '内容不存在或已被删除',
    '-500': '服务器内部错误，请稍后重试',
    '65531': '接口已下线或参数错误',
};

/**
 * 根据 API 响应码获取用户友好的错误消息。
 * @param {number} code - API 返回的错误码。
 * @param {string} defaultMsg - API 返回的原始消息。
 * @returns {string}
 */
export function getApiErrorMessage(code, defaultMsg) {
    return API_ERROR_MAP[String(code)] || defaultMsg;
}

/**
 * 从 pageInfo 中提取分页元数据。
 * @param {object} pageInfo - B 站 API 返回的页面数据。
 * @returns {{ currentPage: number, totalCount: number, pageSize: number, totalPages: number }}
 */
export function buildPagination(pageInfo) {
    const currentPage = pageInfo.page?.num || 1;
    const totalCount = pageInfo.page?.count || 0;
    const pageSize = pageInfo.page?.size || 20;
    const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1;
    return { currentPage, totalCount, pageSize, totalPages };
}

/**
 * 聚合热门评论和普通评论。
 * @param {object} pageInfo - B 站 API 返回的页面数据。
 * @returns {Array<object>}
 */
export function aggregateComments(pageInfo) {
    return [...(pageInfo.hots || []), ...(pageInfo.replies || [])];
}
