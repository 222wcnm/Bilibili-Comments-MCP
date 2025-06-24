/**
 * 简单校验 Cookie 字符串是否有效。
 * @param {string} cookie - 待校验的 Cookie。
 * @returns {boolean}
 */
export function validateCookie(cookie) {
    return cookie && typeof cookie === 'string' && cookie.includes('SESSDATA');
}

/**
 * 从 SESSDATA 构建完整的 Cookie 字符串。
 * @param {string} sessdata - SESSDATA 值。
 * @returns {string} 完整的 Cookie 字符串。
 */
export function buildCookieFromSessdata(sessdata) {
    return `SESSDATA=${sessdata}`;
}

/**
 * 获取有效的 Cookie，优先使用传入参数，其次从环境变量读取。
 * @param {string} cookieParam - 传入的 cookie 参数。
 * @returns {string|null} 有效的 Cookie 字符串或 null。
 */
export function getValidCookie(cookieParam) {
    // 优先使用传入的 cookie 参数
    if (cookieParam && validateCookie(cookieParam)) {
        return cookieParam;
    }

    // 检查 BILIBILI_SESSDATA 环境变量
    const sessdata = process.env.BILIBILI_SESSDATA;
    if (sessdata && typeof sessdata === 'string' && sessdata.trim()) {
        return buildCookieFromSessdata(sessdata.trim());
    }

    return null;
}

/**
 * 验证动态 ID 格式。
 * @param {string} dynamicId - 动态 ID。
 * @returns {boolean} 是否为有效格式。
 */
export function validateDynamicId(dynamicId) {
    return dynamicId && typeof dynamicId === 'string' && /^\d+$/.test(dynamicId) && dynamicId.length >= 10;
}
