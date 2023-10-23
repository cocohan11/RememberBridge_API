/** 추억공간 API */
const express = require('express');
const router = express.Router();
const spaceMngDB = require('../model/spaceMng');
const resCode = require('../util/resCode');
const multerMid = require('../util/multerMid'); // S3 multer 사진저장 미들웨어 별도 파일로 정리해둠


// S3 사진저장경로 별 미들웨어
const uploadForDog = multerMid('profile/dog'); // 'profile/dog' 경로를 사용하는 미들웨어 생성 // 반려견프사 (1장)
const uploadForTimelines = multerMid('memory_space/timeline'); // 추억공간 타임라인 사진들 (여러 장)
const uploadForBackground = multerMid('memory_space/background');  // 추억공간 배경사진 (1장)


//--------------------------------------------------------

/** 댓글 삭제 API */
router.get('/diary/comment/delete/:comment_id?', async (req, res) => { 

  // API 정보
  const apiName = '댓글 삭제 API';
  console.log(apiName);

  // 파라미터값 누락 확인
  if (!req.params.comment_id) {
    console.log('req.params %o:', req.params);
    return resCode.returnResponseCode(res, 1002, apiName, null, null);
  } 

  // DB
  const result = await spaceMngDB.removeDiaryComment(req.params);
  console.log('result %o:', result); 

  // response
  return resCode.returnResponseCode(res, result, apiName, null, null); 

})

/** 댓글 수정 API */
router.post('/diary/comment/edit', async (req, res) => { 

  // API 정보
  const apiName = '댓글 수정 API';
  console.log(apiName);
  console.log('req.body %o:', req.body);

  // 파라미터값 누락 확인
  if (!req.body.comment_id || !req.body.comment_text) { 
    console.log('req.body %o:', req.body);
    return resCode.returnResponseCode(res, 1002, apiName, null, null);
  }

  // DB
  const plusResult = await spaceMngDB.changeComment(req.body);
  console.log('plusResult %o:', plusResult); 

  // response
  if (plusResult != 9999 && plusResult != 1005 && plusResult != undefined) {
    return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳
  } else {
    return resCode.returnResponseCode(res, plusResult, apiName, null, null);
  }

})

/** 댓글 모두보기 API */
router.get('/diary/comment/:diary_id?', async (req, res) => {

  // API 정보
  const apiName = '댓글 모두보기 API';
  console.log(apiName);

  // 파라미터값 누락 확인
  if (!req.params.diary_id) {
    console.log('req.params %o:', req.params);
    return resCode.returnResponseCode(res, 1002, apiName, null, null);
  } 

  // DB
  const plusResult = await spaceMngDB.getDiaryComments(req.params);
  console.log('plusResult %o:', plusResult); 

  // response
  if (plusResult != 9999 && plusResult != 1005 && plusResult != undefined) {
    return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳
  } else {
    return resCode.returnResponseCode(res, plusResult, apiName, null, null);
  }

})

/** 댓글 작성 API */
router.post('/diary/comment', async (req, res) => { 

  // API 정보
  const apiName = '댓글 작성 API';
  console.log(apiName);
  console.log('req.body %o:', req.body);

  // 파라미터값 누락 확인
  if (!req.body.diary_id || !req.body.user_id || !req.body.comment_text) { // 사진 필수값 (최소1장)
    console.log('req.body %o:', req.body);
    return resCode.returnResponseCode(res, 1002, apiName, null, null);
  }

  // DB
  const plusResult = await spaceMngDB.addComment(req.body);
  console.log('plusResult %o:', plusResult); 

  // response
  if (plusResult != 9999 && plusResult != 1005 && plusResult != undefined) {
    return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳
  } else {
    return resCode.returnResponseCode(res, plusResult, apiName, null, null);
  }

})



/** 일기 상세조회 API */
router.get('/diary/info/detail/:diary_id?/:user_id?', async (req, res) => { 

  // API 정보
  const apiName = '일기 상세조회 API';
  console.log(apiName);
  console.log('req.params %o:', req.params);
  const diaryId = parseInt(req.params.diary_id, 10); // 문자열로 받아와짐
  const userId = parseInt(req.params.user_id, 10);

  // 파라미터값 누락 확인
  if (!diaryId || !userId) {
    console.log('req.params %o:', req.params);
    return resCode.returnResponseCode(res, 1002, apiName, null, null);
  } 

  // DB
  const plusResult = await spaceMngDB.getDiaryDetail(diaryId, userId);
  console.log('plusResult %o:', plusResult); 
  // const plusResult = { like_state: result }; // 원하는 출력 모양을 추가함
  
  // response
  if (plusResult != 9999 && plusResult != 1005 ) {
    return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳
  } else {
    return resCode.returnResponseCode(res, plusResult, apiName, null, null); // 1005 또는 9999
  }

})

/** 일기 좋아요 등록/해제 API */
router.get('/diary/like/:diary_id/:user_id', async (req, res) => { 

  // API 정보
  const apiName = '좋아요 등록/해제 API';
  console.log(apiName);
  const diaryId = parseInt(req.params.diary_id, 10);
  const userId = parseInt(req.params.user_id, 10);
  console.log('diaryId %o', diaryId); 
  console.log('userId %o', userId); 

  // 파라미터값 누락 확인
  if (!diaryId || !userId) {
    console.log('req.params %o:', req.params);
    return resCode.returnResponseCode(res, 1002, apiName, null, null);
  } 

  // DB
  const result = await spaceMngDB.setLike(diaryId, userId);
  console.log('result %o:', result); 
  const plusResult = { like_state: result }; // 원하는 출력 모양을 추가함
  
  // response
  if (result != 9999) {
    return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳
  } else {
    return resCode.returnResponseCode(res, 9999, apiName, null, null);
  }

})

/** 추억공간 배경사진 수정 API (사진1장) */
router.post('/background', uploadForBackground.single('dog_bkg_img'), async (req, res) => { // 사진저장 미들웨어

  // API 정보
  const apiName = '추억공간 배경사진 수정 API';
  console.log(apiName);
 
  // 사진 확인
  console.log('req.file', req.file);

  // 파라미터값 누락 확인
  if (!req.file || !req.body.dog_id) { // 사진 필수
    console.log('req.body %o:', req.body);
    return resCode.returnResponseCode(res, 1002, apiName, null, null);
  } 


  // DB
  const result = await spaceMngDB.changeBackgroundImg(req.body, req.file ? req.file.location : null); // .location에서 에러나서 null처리함
  console.log('result %o:', result); // 성공시) result=2000 응답

  // response
  if (result == 2000) {
    const plusResult = { dog_bkg_img: req.file.location }; // 원하는 출력 모양을 추가함
    return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳
  } else {
    return resCode.returnResponseCode(res, result, apiName, null, null);
  }

})

/** 타임라인 조회 (추억공간 첫 화면) API */
router.get('/timeline/:user_id?/:dog_id?', async (req, res) => {

  // API 정보
  const apiName = '타임라인 조회 API';
  console.log(apiName);

  // 파라미터값 누락 확인
  if (!req.params.user_id || !req.params.dog_id) {
    console.log('req.params %o:', req.params);
    return resCode.returnResponseCode(res, 1002, apiName, null, null);
  } 

  // DB
  const plusResult = await spaceMngDB.getTimeline(req.params);
  console.log('plusResult %o:', plusResult); 

  // response
  if (plusResult != 9999 || plusResult != 1005 || plusResult != undefined) {
    return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳
  } else {
    return resCode.returnResponseCode(res, 9999, apiName, null, null);
  }

})

/** 일기 수정 API */
router.post('/diary/edit', uploadForTimelines.array('dairy_imgs', 5), async (req, res) => { // 최대 5장

  // API 정보
  const apiName = '추억 일기 수정 API';
  console.log(apiName);
  console.log('req.body %o:', req.body);
  console.log('req.files %o:', req.files);

  // 파라미터값 누락 확인
  if (!req.body.diary_id || !req.body.select_date || !req.body.emotion || !req.body.diary_content) {
    console.log('req.body %o:', req.body);
    return resCode.returnResponseCode(res, 1002, apiName, null, null);
  } 
  
  // 사진파일정보
  let fileInfo = await getfileInfo(req);
  console.log('fileInfo', fileInfo);

  // DB
  const result = await spaceMngDB.changeDiary(req.body, req.files, fileInfo);
  console.log('result %o:', result); 

  // response
  if (result == 2000) {
    return resCode.returnResponseCode(res, 2000, apiName, null, null); // 성공시 응답받는 곳
  } else if (result == 1005) {
    return resCode.returnResponseCode(res, 1005, apiName, null, null); 
  } else {
    return resCode.returnResponseCode(res, 9999, apiName, null, null);
  }

})

/** 일기 삭제 API */
router.get('/diary/delete/:diary_id?', async (req, res) => { 

  // API 정보
  const apiName = '추억 일기 삭제 API';
  console.log(apiName);

  // 파라미터값 누락 확인
  if (!req.params.diary_id) {
    console.log('req.params %o:', req.params);
    return resCode.returnResponseCode(res, 1002, apiName, null, null);
  } 

  // DB
  const result = await spaceMngDB.removeDiary(req.params);
  console.log('result %o:', result); 

  // response
  if (result == 2000) {
    return resCode.returnResponseCode(res, 2000, apiName, null, null); // 성공시 응답받는 곳
  } else {
    return resCode.returnResponseCode(res, 9999, apiName, null, null);
  }

})

/** 일기 조회 API */
router.get('/diary/info/:diary_id?', async (req, res) => {

  // API 정보
  const apiName = '추억 일기 조회 API';
  console.log(apiName);

  // 파라미터값 누락 확인
  if (!req.params.diary_id) {
    console.log('req.params %o:', req.params);
    return resCode.returnResponseCode(res, 1002, apiName, null, null);
  } 

  // DB
  const plusResult = await spaceMngDB.getDiary(req.params);
  console.log('plusResult %o:', plusResult); 

  // response
  if (plusResult != 9999 || plusResult != 1005 || plusResult != undefined) {
    return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳
  } else {
    return resCode.returnResponseCode(res, 9999, apiName, null, null);
  }

})

/** 일기 작성 API */
router.post('/diary', uploadForTimelines.array('dairy_imgs', 5), async (req, res) => { // 최대 5장

  // API 정보
  const apiName = '추억일기 등록 API';
  console.log(apiName);
  console.log('req.body %o', req.body);
  console.log('req.diary_imgs  %o', req.diary_imgs );

  // 파라미터값 누락 확인
  if (req.files.length == 0 || !req.body.space_id || !req.body.select_date || !req.body.emotion || !req.body.diary_content) { // 사진 필수값 (최소1장)
    console.log('req.body %o:', req.body);
    console.log('req.files %o:', req.files);
    return resCode.returnResponseCode(res, 1002, apiName, null, null);
  }

  // 사진 확인
  console.log('req.files', req.files);
  // 저장된 사진 URL 배열

  let fileInfo = await getfileInfo(req);
  console.log('fileInfo', fileInfo);
  
  // DB
  const diary_id = await spaceMngDB.addDiary(req.body, fileInfo);
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

//-------------------- 함수 -----------------------
// S3 파일삭제 함수
async function getfileInfo(req) {
  // 저장된 사진 URL 배열
  const locations = req.files.map((file) => file.location); // req.files에서 location 속성만 추출하여 배열로 만듦
  const bucket = req.files.map((file) => file.bucket);
  const key = req.files.map((file) => file.key); 

  return {
    locations : locations,
    bucket: bucket,
    key:key
  }
}


module.exports = router;
