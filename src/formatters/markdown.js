import pLimit from 'p-limit';
import { buildPagination, aggregateComments } from '../utils/common.js';

// 共享并发控制实例
const limit = pLimit(10);

/**
 * 格式化单条评论的 Markdown 内容。
 * @param {object} comment - 单条评论数据。
 * @returns {string}
 */
function formatSingleComment(comment) {
    const timeStr = new Date(comment.ctime * 1000).toLocaleString('zh-CN', { hour12: false });
    const userLevel = comment.member.level_info?.current_level || 0;

    let md = `**👤 ${comment.member.uname}** (Lv.${userLevel}) | 👍 ${comment.like} | 🕐 ${timeStr}\n`;
    md += `> ${comment.content.message.replace(/\n/g, '\n> ')}\n`;
    return md;
}

/**
 * 格式化包含楼中楼回复的完整评论区块。
 * @param {object} comment - 主评论数据。
 * @param {Array|'fetch_failed'} replies - 楼中楼回复数据。
 * @returns {string}
 */
function formatCommentWithReplies(comment, replies) {
    let md = formatSingleComment(comment);

    if (replies === 'fetch_failed') {
        md += `  ↳ ⚠️ *此评论的楼中楼回复加载失败，请稍后重试。*\n`;
    } else if (replies.length > 0) {
        md += `\n**📝 楼中楼回复** (共 ${comment.rcount} 条，显示前 ${replies.length} 条):\n`;
        replies.forEach(reply => {
            const replyTime = new Date(reply.ctime * 1000).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            md += `  ↳ **${reply.member.uname}**: ${reply.content.message} *(👍${reply.like} | ${replyTime})*\n`;
        });
        if (comment.rcount > replies.length) {
            md += `  ↳ *...还有 ${comment.rcount - replies.length} 条回复*\n`;
        }
    }

    md += "\n---\n\n";
    return md;
}

/**
 * 获取所有评论的楼中楼回复（并发控制）。
 * @param {Array} comments - 评论列表。
 * @param {boolean} includeReplies - 是否获取回复。
 * @param {Function} fetchRepliesFn - 楼中楼获取函数。
 * @returns {Promise<Array>}
 */
async function fetchAllReplies(comments, includeReplies, fetchRepliesFn) {
    const replyTasks = includeReplies
        ? comments.map(comment => {
            if (comment.rcount > 0) {
                return limit(() => fetchRepliesFn(comment));
            }
            return Promise.resolve([]);
        })
        : comments.map(() => Promise.resolve([]));

    return Promise.all(replyTasks);
}

/**
 * 生成分页提示文本。
 * @param {number} currentPage
 * @param {number} totalPages
 * @returns {string}
 */
function buildPaginationFooter(currentPage, totalPages) {
    let md = `✅ **成功加载第 ${currentPage} 页的评论。**\n`;
    if (currentPage < totalPages) {
        md += `💡 如需浏览下一页 (第 ${currentPage + 1} 页), 请在下次请求时指定 \`page: ${currentPage + 1}\`。`;
    } else {
        md += `🏁 已到达最后一页。`;
    }
    return md;
}

/**
 * 生成视频评论的 Markdown 格式报告。
 * @param {object} pageInfo - B 站 API 返回的页面数据。
 * @param {boolean} includeReplies - 是否包含楼中楼回复。
 * @param {Function} fetchRepliesFn - 获取楼中楼的函数。
 * @returns {Promise<string>}
 */
export async function generateVideoMarkdown(pageInfo, includeReplies, fetchRepliesFn) {
    const { currentPage, totalCount, totalPages } = buildPagination(pageInfo);

    let md = `## 📺 B 站评论分析结果\n\n`;
    md += `📄 **当前显示**: 第 ${currentPage} / ${totalPages} 页\n`;
    md += `📊 **评论总数**: ${totalCount} 条\n\n`;

    const allComments = aggregateComments(pageInfo);

    if (allComments.length === 0) {
        md += "😴 **此页面没有评论。**\n\n";
        md += "✅ 分析完成。如果视频有更多评论，请尝试请求其他页面。";
        return md;
    }

    const allReplies = await fetchAllReplies(allComments, includeReplies, fetchRepliesFn);

    md += "### 💬 评论列表\n";
    allComments.forEach((comment, index) => {
        md += formatCommentWithReplies(comment, allReplies[index] || []);
    });

    md += "---\n\n";
    md += buildPaginationFooter(currentPage, totalPages);

    return md;
}

/**
 * 生成动态评论的 Markdown 格式报告。
 * @param {object} pageInfo - B 站 API 返回的页面数据。
 * @param {boolean} includeReplies - 是否包含楼中楼回复。
 * @param {Function} fetchRepliesFn - 获取楼中楼的函数。
 * @param {string} dynamicType - 动态类型信息。
 * @returns {Promise<string>}
 */
export async function generateDynamicMarkdown(pageInfo, includeReplies, fetchRepliesFn, dynamicType = '普通动态') {
    const { currentPage, totalCount, totalPages } = buildPagination(pageInfo);

    let md = `## 📱 B 站动态评论分析结果\n\n`;
    md += `📱 **动态类型**: ${dynamicType}\n`;
    md += `📄 **当前显示**: 第 ${currentPage} / ${totalPages} 页\n`;
    md += `📊 **评论总数**: ${totalCount} 条\n\n`;

    const allComments = aggregateComments(pageInfo);

    if (allComments.length === 0) {
        md += "😴 **此页面没有评论。**\n\n";
        md += "✅ 分析完成。如果动态有更多评论，请尝试请求其他页面。";
        return md;
    }

    const allReplies = await fetchAllReplies(allComments, includeReplies, fetchRepliesFn);

    md += "### 💬 评论列表\n";
    allComments.forEach((comment, index) => {
        md += formatCommentWithReplies(comment, allReplies[index] || []);
    });

    md += "---\n\n";
    md += buildPaginationFooter(currentPage, totalPages);

    return md;
}
