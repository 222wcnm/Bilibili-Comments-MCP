import { describe, it, expect } from 'vitest';
import { getApiErrorMessage, buildPagination, aggregateComments } from '../../src/utils/common.js';

describe('getApiErrorMessage', () => {
    it('已知错误码应返回对应中文消息', () => {
        expect(getApiErrorMessage(-101, 'default')).toBe('账号未登录或 Cookie 已过期');
        expect(getApiErrorMessage(-403, 'default')).toBe('访问权限不足');
        expect(getApiErrorMessage(-404, 'default')).toBe('内容不存在或已被删除');
    });

    it('未知错误码应返回默认消息', () => {
        expect(getApiErrorMessage(999, '未知错误')).toBe('未知错误');
    });
});

describe('buildPagination', () => {
    it('应正确计算分页信息', () => {
        const result = buildPagination({ page: { num: 2, count: 100, size: 20 } });
        expect(result).toEqual({
            currentPage: 2,
            totalCount: 100,
            pageSize: 20,
            totalPages: 5,
        });
    });

    it('缺失字段应使用默认值', () => {
        const result = buildPagination({ page: {} });
        expect(result).toEqual({
            currentPage: 1,
            totalCount: 0,
            pageSize: 20,
            totalPages: 0,
        });
    });

    it('无 page 对象时应使用默认值', () => {
        const result = buildPagination({});
        expect(result).toEqual({
            currentPage: 1,
            totalCount: 0,
            pageSize: 20,
            totalPages: 0,
        });
    });
});

describe('aggregateComments', () => {
    it('应合并 hots 和 replies', () => {
        const hot = { id: 1 };
        const reply = { id: 2 };
        const result = aggregateComments({ hots: [hot], replies: [reply] });
        expect(result).toEqual([hot, reply]);
    });

    it('缺失字段时应返回空数组', () => {
        expect(aggregateComments({})).toEqual([]);
        expect(aggregateComments({ hots: null, replies: null })).toEqual([]);
    });
});
