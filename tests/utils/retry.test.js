import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../src/utils/retry.js';

describe('withRetry', () => {
    it('应在第一次成功时直接返回结果', async () => {
        const fn = vi.fn().mockResolvedValue('ok');
        const result = await withRetry(fn);
        expect(result).toBe('ok');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应在失败后重试直到成功', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce(new Error('fail1'))
            .mockRejectedValueOnce(new Error('fail2'))
            .mockResolvedValue('ok');

        const result = await withRetry(fn, { maxRetries: 3, delay: 10 });
        expect(result).toBe('ok');
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it('应在所有重试均失败后抛出异常', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

        await expect(
            withRetry(fn, { maxRetries: 2, delay: 10, errorPrefix: '测试错误' })
        ).rejects.toThrow('测试错误: persistent failure');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('softFail 模式下应返回 fetch_failed 而非抛出异常', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('fail'));

        const result = await withRetry(fn, { maxRetries: 2, delay: 10, softFail: true });
        expect(result).toBe('fetch_failed');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('超时错误应返回友好提示', async () => {
        const timeoutError = new Error('timeout');
        timeoutError.code = 'ECONNABORTED';
        const fn = vi.fn().mockRejectedValue(timeoutError);

        await expect(
            withRetry(fn, { maxRetries: 1, delay: 10 })
        ).rejects.toThrow('请求超时，请稍后重试');
    });
});
