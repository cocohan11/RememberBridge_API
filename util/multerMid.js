// ---------------------- 미들웨어 -----------------------
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');
const multer = require('multer');


let s3 = new S3Client({
    region: 'ap-northeast-2',
    credentials: {
      accessKeyId: process.env.AWS_S3_ACCESS_ID,
      secretAccessKey: process.env.AWS_S3_ACCESS_KEY,
    },
    sslEnabled: false,
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
  });
  
  // 멀터 미들웨어를 생성하는 함수
  const createMulterMiddleware = (dynamicPath) => {
    return multer({
      storage: multerS3({
        s3: s3,
        bucket: 'rb2web-rembridge',
        key: function (req, file, cb) {
          cb(null, `${dynamicPath}/${Date.now()}${path.basename(file.originalname)}`);
        },
        ContentType: multerS3.AUTO_CONTENT_TYPE,
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    });
};
  
module.exports = createMulterMiddleware;
