// src/config/r2.config.js

const { S3Client } = require('@aws-sdk/client-s3');
const { NodeHttpHandler } = require('@smithy/node-http-handler'); // 1. Import NodeHttpHandler
const dotenv = require('dotenv');

dotenv.config();

const accountId = process.env.ACCOUNT_ID;
const accessKeyId = process.env.ACCESS_KEY_ID;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

const r2 = new S3Client({
  region: 'auto',
  endpoint: endpoint,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
  // 2. Thêm requestHandler để tăng giới hạn kết nối
  requestHandler: new NodeHttpHandler({
    requestTimeout: 30000,
    connectionTimeout: 30000,
    socketAcquisitionWarningTimeout: 2000, // (Tùy chọn) Tăng thời gian cảnh báo
    maxSockets: 200 // **Tăng giới hạn kết nối lên 200 (hoặc cao hơn nếu cần)**
  }),
});
module.exports = {
  r2,
}