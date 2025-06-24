#!/usr/bin/env node

import { BilibiliMCPServer } from './server.js';

const server = new BilibiliMCPServer();
server.run().catch((error) => {
    console.error("❌ 服务器启动失败:", error);
    process.exit(1);
});
