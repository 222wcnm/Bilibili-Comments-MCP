import { createHash } from 'crypto';
import axios from 'axios';

/**
 * WBI 签名工具模块。
 * B 站 Web 端接口使用 WBI 鉴权（w_rid + wts 参数）来防止请求伪造。
 *
 * 算法流程：
 * 1. 从 /x/web-interface/nav 获取 img_key 和 sub_key
 * 2. 按 MIXIN_KEY_ENC_TAB 映射表重排合并后的 key，取前 32 位得到 mixin_key
 * 3. 对请求参数 + wts 时间戳 + mixin_key 计算 MD5 得到 w_rid
 */

// 固定的重排映射表
const MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

// 缓存的 WBI keys
let cachedKeys = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 小时缓存

/**
 * 生成 mixin_key。
 * @param {string} imgKey
 * @param {string} subKey
 * @returns {string} 32 位的 mixin_key
 */
function getMixinKey(imgKey, subKey) {
    const rawKey = imgKey + subKey;
    return MIXIN_KEY_ENC_TAB
        .map(index => rawKey[index])
        .join('')
        .slice(0, 32);
}

/**
 * 从 URL 中提取 key（文件名去后缀）。
 * @param {string} url - 类似 https://i0.hdslb.com/bfs/wbi/xxx.png 的 URL
 * @returns {string}
 */
function extractKeyFromUrl(url) {
    const filename = url.split('/').pop();
    return filename.split('.')[0];
}

/**
 * 从 B 站 nav 接口获取 img_key 和 sub_key。
 * @param {string} cookie - 用户 Cookie
 * @returns {Promise<{imgKey: string, subKey: string}>}
 */
async function fetchWbiKeys(cookie) {
    const response = await axios.get('https://api.bilibili.com/x/web-interface/nav', {
        headers: {
            "Cookie": cookie,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 10000,
    });

    if (response.data.code !== 0) {
        throw new Error(`获取 WBI keys 失败 (${response.data.code}): ${response.data.message}`);
    }

    const { img_url, sub_url } = response.data.data.wbi_img;
    return {
        imgKey: extractKeyFromUrl(img_url),
        subKey: extractKeyFromUrl(sub_url),
    };
}

/**
 * 获取 WBI keys（带缓存）。
 * @param {string} cookie - 用户 Cookie
 * @returns {Promise<{imgKey: string, subKey: string}>}
 */
async function getWbiKeys(cookie) {
    const now = Date.now();
    if (cachedKeys && (now - cacheTimestamp) < CACHE_DURATION_MS) {
        return cachedKeys;
    }

    cachedKeys = await fetchWbiKeys(cookie);
    cacheTimestamp = now;
    return cachedKeys;
}

/**
 * 对请求参数进行 WBI 签名。
 * @param {object} params - 原始请求参数。
 * @param {string} cookie - 用户 Cookie（用于获取 WBI keys）。
 * @returns {Promise<object>} 附加了 w_rid 和 wts 的参数对象。
 */
export async function signParams(params, cookie) {
    const { imgKey, subKey } = await getWbiKeys(cookie);
    const mixinKey = getMixinKey(imgKey, subKey);

    // 添加时间戳
    const wts = Math.floor(Date.now() / 1000);
    const signedParams = { ...params, wts };

    // 按 key 排序，拼接为 query string
    const sortedKeys = Object.keys(signedParams).sort();
    const queryParts = sortedKeys.map(key => {
        // 过滤特殊字符（!'()*）
        const value = String(signedParams[key]).replace(/[!'()*]/g, '');
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    });
    const queryString = queryParts.join('&');

    // 计算 MD5
    const wRid = createHash('md5').update(queryString + mixinKey).digest('hex');

    return { ...signedParams, w_rid: wRid };
}

/**
 * 清除 WBI keys 缓存。用于测试或强制刷新。
 */
export function clearWbiCache() {
    cachedKeys = null;
    cacheTimestamp = 0;
}
