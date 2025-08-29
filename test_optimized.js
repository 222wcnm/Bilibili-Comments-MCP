#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';

// 读取环境变量中的SESSDATA
const sessdata = process.env.BILIBILI_SESSDATA;

if (!sessdata) {
  console.error('❌ 请先设置 BILIBILI_SESSDATA 环境变量');
  process.exit(1);
}

console.log('🚀 测试优化后的B站评论工具...');
console.log('🔍 SESSDATA已设置:', sessdata ? '✅' : '❌');

// 创建子进程运行MCP服务器
const server = spawn('node', ['bilibili_mcp.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverReady = false;
let outputBuffer = '';

// 监听服务器输出
server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('[服务器输出]:', output);
  
  // 检查服务器是否启动成功
  if (output.includes('Bilibili 评论工具已启动')) {
    serverReady = true;
    console.log('✅ 服务器启动成功，开始测试...');
    testTool();
  }
});

server.stderr.on('data', (data) => {
  console.error('[服务器错误]:', data.toString());
});

server.on('close', (code) => {
  console.log(`[服务器关闭] 退出码: ${code}`);
});

// 模拟MCP客户端请求
function testTool() {
  console.log('\n🧪 开始测试工具功能...');
  
  // 测试1: 获取视频评论 (Markdown格式)
  console.log('\n📝 测试1: 获取视频评论 (Markdown格式)');
  sendToolRequest({
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_video_comments",
      "arguments": {
        "bvid": "BV1xx411c7mD",
        "page": 1,
        "pageSize": 5,
        "includeReplies": true,
        "outputFormat": "markdown"
      }
    }
  });

  // 等待一段时间后测试JSON格式
  setTimeout(() => {
    console.log('\n📊 测试2: 获取视频评论 (JSON格式)');
    sendToolRequest({
      "jsonrpc": "2.0",
      "id": 2,
      "method": "tools/call",
      "params": {
        "name": "get_video_comments",
        "arguments": {
          "bvid": "BV1xx411c7mD",
          "page": 1,
          "pageSize": 3,
          "includeReplies": false,
          "outputFormat": "json"
        }
      }
    });
  }, 3000);

  // 再等待一段时间后测试动态评论
  setTimeout(() => {
    console.log('\n📱 测试3: 获取动态评论 (Markdown格式)');
    // 注意: 这里需要一个真实的动态ID来测试
    console.log('⚠️  动态评论测试需要真实的动态ID，请手动测试');
    
    // 关闭服务器
    setTimeout(() => {
      console.log('\n⏹️  测试完成，关闭服务器...');
      server.kill();
    }, 2000);
  }, 6000);
}

// 发送工具请求的函数
function sendToolRequest(request) {
  try {
    const requestString = JSON.stringify(request) + '\n';
    server.stdin.write(requestString);
    console.log('📤 发送请求:', JSON.stringify(request, null, 2));
  } catch (error) {
    console.error('❌ 发送请求失败:', error.message);
  }
}

// 5秒后如果服务器还没启动就强制退出
setTimeout(() => {
  if (!serverReady) {
    console.log('⏰ 服务器启动超时，退出测试');
    server.kill();
    process.exit(1);
  }
}, 5000);
