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

// S3 사진저장경로 별 미들웨어
const uploadForDog = createMulterMiddleware('profile/dog'); // 'profile/dog' 경로를 사용하는 미들웨어 생성 // 반려견프사 (1장)
const uploadForUser = createMulterMiddleware('profile/user'); // 유저프사 (1장)
const uploadForTimelines = createMulterMiddleware('memory_space/timeline'); // 추억공간 타임라인 사진들 (여러 장)
const uploadForBackground = createMulterMiddleware('memory_space/background');  // 추억공간 배경사진 (1장)


//--------------------------------------------------------

/** 일기 등록 API */
router.post('/diary', uploadForTimelines.array('dairy_imgs', 5), async (req, res) => { // 최대 5장

  // API 정보
  const apiName = '추억일기 등록 API';
  console.log(apiName);

  // 파라미터값 누락 확인
  if (!req.files[0] || !req.body.space_id || !req.body.select_date || !req.body.emotion || !req.body.dairy_content) { // 사진 필수값 (최소1장)
    console.log('req.body %o:', req.body);
    console.log('req.files %o:', req.files);
    return resCode.returnResponseCode(res, 1002, apiName, null, null);
  } 

  // 사진 확인
  console.log('req.files', req.files);
  // 저장된 사진 URL 배열
  const locations = req.files.map((file) => file.location); // req.files에서 location 속성만 추출하여 배열로 만듦
  console.log(locations);

  // DB
  const diary_id = await spaceMngDB.addDiary(req.body, locations);
  console.log('diary_id %o:', diary_id); // 성공시) diary_id 응답

  // response
  if (diary_id != 9999 || diary_id != 1005 || diary_id != undefined) {
    const plusResult = { diary_id: diary_id }; // 원하는 출력 모양을 추가함
    return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳
  } else {
    return resCode.returnResponseCode(res, 9999, apiName, null, null);
  }

})


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
router.post('/dog/edit', uploadForDog.single('dog_prof_img'), async (req, res) => { // 사진저장 미들웨어

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
router.post('/', uploadForDog.single('dog_prof_img'), async (req, res) => { // 사진저장 미들웨어

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

/** test) multer 다중사진 API */
router.post('/test/multer', uploadForTimelines.array('dairy_imgs', 3), async (req, res) => { // 최대 3장

  // API 정보
  const apiName = 'test) multer 다중사진 API';
  console.log(apiName);

  // 사진 확인
  console.log('req.files', req.files);

  // req.files에서 location 속성만 추출하여 배열로 만듦
  const locations = req.files.map((file) => file.location);
  console.log(locations);

  return resCode.returnResponseCode(res, 2000, apiName, null, null);
})
//-------------------- 예외 미들웨어 -----------------------
// 멀터 예외 처리 미들웨어
router.use((err, req, res, next) => { // 멀터 미들웨어보다 뒤에있어야함 
  console.error(err);
  if (err instanceof multer.MulterError) {
    return resCode.returnResponseCode(res, 9999, null, null, 'Unexpected field');
  }
});
module.exports = router;
