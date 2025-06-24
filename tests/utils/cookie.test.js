import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateCookie, buildCookieFromSessdata, getValidCookie, validateDynamicId } from '../../src/utils/cookie.js';

describe('validateCookie', () => {
    it('包含 SESSDATA 的字符串应返回 true', () => {
        expect(validateCookie('SESSDATA=abc123')).toBe(true);
    });

    it('不包含 SESSDATA 的字符串应返回 falsy', () => {
        expect(validateCookie('other_cookie=value')).toBeFalsy();
    });

    it('空值应返回 falsy', () => {
        expect(validateCookie(null)).toBeFalsy();
        expect(validateCookie(undefined)).toBeFalsy();
        expect(validateCookie('')).toBeFalsy();
    });
});

describe('buildCookieFromSessdata', () => {
    it('应正确构建 Cookie 字符串', () => {
        expect(buildCookieFromSessdata('abc123')).toBe('SESSDATA=abc123');
    });
});

describe('getValidCookie', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('应优先使用传入的 cookie 参数', () => {
        process.env.BILIBILI_SESSDATA = 'env_sessdata';
        const result = getValidCookie('SESSDATA=param_sessdata');
        expect(result).toBe('SESSDATA=param_sessdata');
    });

    it('传入参数无效时应使用环境变量', () => {
        process.env.BILIBILI_SESSDATA = 'env_sessdata';
        const result = getValidCookie(null);
        expect(result).toBe('SESSDATA=env_sessdata');
    });

    it('两者都无效时应返回 null', () => {
        delete process.env.BILIBILI_SESSDATA;
        const result = getValidCookie(null);
        expect(result).toBeNull();
    });
});

describe('validateDynamicId', () => {
    it('有效的动态 ID 应返回 true', () => {
        expect(validateDynamicId('1234567890')).toBe(true);
        expect(validateDynamicId('12345678901234567')).toBe(true);
    });

    it('过短的 ID 应返回 false', () => {
        expect(validateDynamicId('123')).toBeFalsy();
    });

    it('包含非数字字符应返回 false', () => {
        expect(validateDynamicId('123abc4567')).toBeFalsy();
    });

    it('空值应返回 falsy', () => {
        expect(validateDynamicId(null)).toBeFalsy();
        expect(validateDynamicId(undefined)).toBeFalsy();
    });
});
