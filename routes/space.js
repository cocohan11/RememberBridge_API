/** 추억공간 API */
const express = require('express');
const router = express.Router();
const spaceMngDB = require('../model/spaceMng');
const resCode = require('../util/resCode');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');

// ---------------------- 미들웨어 -----------------------
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

const upload = multer({  
  storage: multerS3({       
    s3: s3,
    bucket: 'rb2web-rembridge',
    key: function (req, file, cb) {
      cb(null, `profile/dog/${Date.now()}${path.basename(file.originalname)}`);
    },
    ContentType: multerS3.AUTO_CONTENT_TYPE, // contentType 자동 설정
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});
//--------------------------------------------------------

/** 추억공간 삭제 API */
router.post('/delete', async (req, res) => {

    // API 정보
    const apiName = '추억공간 삭제 API';
    console.log(apiName);
   
    // 파라미터값 누락 확인
    if (!req.body.space_id) { 
      console.log('req.body %o:', req.body);
      return resCode.returnResponseCode(res, 1002, apiName, null, null);
    } 
  
    // DB
    const result = await spaceMngDB.removeSpace(req.body); 
    console.log('result %o:', result);
  
    // response
    return resCode.returnResponseCode(res, result, apiName, null, null); // 성공했을 때도 응답코드만 리턴해서 if문으로 분기안함
  
})

/** 추억공간 반려견 정보 조회 API */
router.get('/dog/info/:dog_id?', async (req, res) => {

    // API 정보
    const apiName = '추억공간 반려견 정보 조회 API';
    console.log(apiName);
    console.log('req.params %o:', req.params);
   
    // 파라미터값 누락 확인
    if (!req.params.dog_id) {
      console.log('req.params %o:', req.params);
      return resCode.returnResponseCode(res, 1002, apiName, null, null);
    } 
  
    // DB
    const result = await spaceMngDB.getDogInfo(req.params.dog_id); 
    console.log('result is %o:', result);
  
    // response
    if (result.length) {
        const plusResult = { dog_info: result[0] }; // 원하는 출력 모양을 추가함
        return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳    
    } else if (result == 1005) {
      return resCode.returnResponseCode(res, 1005, apiName, null, null); 
    } else {
      return resCode.returnResponseCode(res, 9999, apiName, null, null);
    }
  
})

/** 추억공간 반려견 정보 수정 API */
router.post('/dog/edit', upload.single('dog_prof_img'), async (req, res) => { // 사진저장 미들웨어

    // API 정보
    const apiName = '추억공간 반려견 정보 수정 API';
    console.log(apiName);
   
    // 파라미터값 누락 확인
    if (!req.body.dog_id ||!req.body.dog_name || !req.body.dog_birth || !req.body.dog_breed || !req.body.dog_sex) { // 프로필사진은 필수값 아님
      console.log('req.body %o:', req.body);
      return resCode.returnResponseCode(res, 1002, apiName, null, null);
    } 
  
    // 사진 확인
    console.log('req.file', req.file);
  
    // DB
    const result = await spaceMngDB.changeDog(req.body, req.file ? req.file.location : null); // .location에서 에러나서 null처리함
    console.log('result %o:', result); // 성공시) result=2000 응답
  
    // response
    return resCode.returnResponseCode(res, result, apiName, null, null); // 성공했을 때도 응답코드만 리턴해서 if문으로 분기안함
  
})

/** 추억공간 생성 API */
router.post('/', upload.single('dog_prof_img'), async (req, res) => { // 사진저장 미들웨어

    // API 정보
    const apiName = '추억공간 생성 API';
    console.log(apiName);
   
    // 파라미터값 누락 확인
    if (!req.body.user_email || !req.body.dog_name || !req.body.dog_birth || !req.body.dog_breed || !req.body.dog_sex) { // 프로필사진은 필수값 아님
      console.log('req.body %o:', req.body);
      return resCode.returnResponseCode(res, 1002, apiName, null, null);
    } 

    // 사진 확인
    console.log('req.file', req.file);
  
    // DB
    const plusResult = await spaceMngDB.addSpace(req.body, req.file ? req.file.location : null); // .location에서 에러나서 null처리함
    console.log('plusResult %o:', plusResult); // 성공시) plusResult 응답
  
    // response
    if (plusResult != 9999 || plusResult != 1005 || plusResult != undefined) {
        return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳
    } else {
      return resCode.returnResponseCode(res, 9999, apiName, null, null);
    }
  
})


// ---------------------- TEST -----------------------
//tests API
router.get('/test', async (req, res) => {
    console.log("test");
    message = 'this is space test';

    res.json({
        'message': message
    });
})
module.exports = router;
