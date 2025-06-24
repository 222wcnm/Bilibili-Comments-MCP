import pLimit from 'p-limit';
import { buildPagination, aggregateComments } from '../utils/common.js';

// 共享并发控制实例
const limit = pLimit(10);

/**
 * 格式化单条评论为 JSON 结构。
 * @param {object} comment - 原始评论数据。
 * @returns {object}
 */
function formatComment(comment) {
    return {
        id: comment.rpid,
        user: {
            name: comment.member.uname,
            level: comment.member.level_info?.current_level || 0,
            sex: comment.member.sex || 'unknown'
        },
        content: comment.content.message,
        like: comment.like,
        time: comment.ctime,
        replyCount: comment.rcount,
        location: comment.reply_control?.location?.replace('IP属地：', '') || '未知'
    };
}

/**
 * 格式化单条回复为 JSON 结构。
 * @param {object} reply - 原始回复数据。
 * @returns {object}
 */
function formatReply(reply) {
    return {
        id: reply.rpid,
        user: {
            name: reply.member.uname,
            level: reply.member.level_info?.current_level || 0,
            sex: reply.member.sex || 'unknown'
        },
        content: reply.content.message,
        like: reply.like,
        time: reply.ctime
    };
}

/**
 * 生成 JSON 格式的评论报告。
 * @param {object} pageInfo - B 站 API 返回的页面数据。
 * @param {boolean} includeReplies - 是否包含楼中楼回复。
 * @param {Function} fetchRepliesFn - 获取楼中楼的函数。
 * @returns {Promise<object>}
 */
export async function generateJsonResponse(pageInfo, includeReplies, fetchRepliesFn) {
    const { currentPage, totalCount, pageSize, totalPages } = buildPagination(pageInfo);
    const allComments = aggregateComments(pageInfo);

    // 获取楼中楼回复
    const replyTasks = includeReplies
        ? allComments.map(comment => {
            if (comment.rcount > 0) {
                return limit(() => fetchRepliesFn(comment));
            }
            return Promise.resolve([]);
        })
        : allComments.map(() => Promise.resolve([]));

    const allReplies = await Promise.all(replyTasks);

    const comments = allComments.map((comment, index) => ({
        comment: formatComment(comment),
        replies: Array.isArray(allReplies[index])
            ? allReplies[index].map(formatReply)
            : []
    }));

    return {
        metadata: {
            currentPage,
            totalPages,
            totalCount,
            pageSize,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
        },
        comments
    };
}
