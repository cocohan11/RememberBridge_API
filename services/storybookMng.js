/** 스토리북 비지니스 로직 */

const dbPool = require("../util/dbPool");
const S3function = require("../util/S3function");
const connection = dbPool.init();
const logger = require("../winston/logger");
require("dotenv").config(); // 환경변수 모듈
const {
  AWS_S3_ACCESS_ID,
  AWS_S3_ACCESS_KEY,
  AWS_S3_REGION, // 환경변수'
  NOTICE_LIMIT,
  TIMELINE_LIMIT,
} = process.env;
const AWS = require("aws-sdk");
AWS.config.update({
  region: AWS_S3_REGION,
  accessKeyId: AWS_S3_ACCESS_ID,
  secretAccessKey: AWS_S3_ACCESS_KEY,
});
const s3 = new AWS.S3();
function storybookMng() { }


module.exports = new storybookMng(); // userMng 모듈 export