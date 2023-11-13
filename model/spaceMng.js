/** 추억공간 비지니스 로직 */

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
function spaceMng() { }




/** 알림 읽음처리 (댓글)
 */
spaceMng.prototype.setNoticeToRead = async (query, apiName) => {

  logger.debug({
    API: apiName,
    query: query,
  });

  const res = await mySQLQuery(await changeComment_isRead(query.comment_id, apiName));
  logger.debug({
    API: apiName,
    res: res,
  });

  // 읽음처리 or 이미읽은 댓글
  if (res.changedRows == 1) return 2000; // 1개 레코드 수정됐으면 읽음처리 성공
  if (res.changedRows == 0) return 2009; // 이미 읽은 댓글임
  else return 9999;

};

/** 알림 상세 조회 (댓글)
 */
spaceMng.prototype.getNotice = async (query, apiName) => {

  const page = Number(query.page)-1;
  const limit = Number(NOTICE_LIMIT);
  const offset = limit * page;
  logger.debug({
    API: apiName,
    NOTICE_LIMIT: NOTICE_LIMIT,
    page: page,
    limit: limit,
    offset: offset,
  });

  // 안 읽은 알림 갯수 조회
  let count = await mySQLQuery(await selectUnreadNoticeCount(query.space_id, apiName));
  const notice_count = count[0].count;
  
  let commet_info = await mySQLQuery(await selectCommentInfo(query.space_id, limit, offset, apiName));
  logger.debug({
    API: apiName,
    notice_count,
    commet_info: commet_info,
  });
  if (!commet_info) return 1005; // 조회된 데이터가 없으면 1005 응답
  return {
    notice_count,
    commet_info : commet_info
  }
};

/** 댓글 삭제
 * 1. 존재유무 확인
 * 2. 삭제하기
 */
spaceMng.prototype.removeDiaryComment = async (query, apiName) => {
  // 1. 존재유무 확인
  let comment_info = await mySQLQuery(
    await selectTheDiaryComment(query.comment_id, apiName)
  ); // 해당댓글 조회
  logger.debug({
    API: apiName,
    comment_info: comment_info,
  });
  if (comment_info.length == 0) return 1005;

  // 2. 삭제하기
  let res_delete = await mySQLQuery(
    await removeTheDiaryComment(query.comment_id, apiName)
  );
  logger.debug({
    API: apiName,
    res_delete: res_delete,
  });

  if (res_delete.affectedRows != 1) return 9999; // 삭제실패시 9999 응답
  else return 2000;
};

/** 댓글 수정
 * 1. 댓글 수정쿼리 날리기
 * 2. 수정한 댓글 정보 응답
 */
spaceMng.prototype.changeComment = async (query, apiName) => {
  // 1. 댓글 수정쿼리 날리기
  let res = await mySQLQuery(await changeComment(query, apiName));
  logger.debug({
    API: apiName,
    res: res,
  });

  // 2. 수정한 댓글 정보 응답
  if (res.changedRows == 1) {
    // 1개 레코드 수정됐으면 성공

    // 댓글 전체
    let comment_info = await mySQLQuery(
      await selectTheDiaryComment(query.comment_id, apiName)
    ); // 해당댓글 조회
    logger.debug({
      API: apiName,
      comment_info: comment_info,
    });
    if (comment_info.length == 0) return 1005;

    // 최종응답값에 들어갈 데이터
    return {
      comment_info,
    };
  } else return 1005;
};

/** 댓글 모두보기
 * 1. 댓글 전체 응답 (Comment 테이블)
 * 2. 댓글 갯수
 */
spaceMng.prototype.getDiaryComments = async (query, apiName) => {
  // 2. 댓글 전체
  let comment_info = await mySQLQuery(
    await selectDiaryComment(query.diary_id, 1000, apiName)
  ); // 최신댓글 1000개 조회
  logger.debug({
    API: apiName,
    comment_info: comment_info,
  });
  if (comment_info.length == 0) return 1005;

  // 2.count
  let count = await mySQLQuery(
    await selectDiaryCommentCount(query.diary_id, apiName)
  );
  logger.debug({
    API: apiName,
    count: count.count,
  });

  // 최종응답값에 들어갈 데이터
  return {
    comment_info,
    count: count.count,
  };
};

/** 댓글 작성
 * 1. 댓글 작성
 * 2. 댓글 갯수
 * 2. 댓글 내용
 */
spaceMng.prototype.addComment = async (query, apiName) => {
  // 1.댓글 작성
  let comment_id = await mySQLQuery(await addComment(query, apiName));
  comment_id = comment_id.insertId; // comment_id만 추출
  logger.debug({
    API: apiName,
    comment_id: comment_id,
  });
  if (!comment_id) return 9999; // 저장안됐으면 9999응답

  // 2. 댓글 내용
  let diary_comment = await mySQLQuery(
    await selectDiaryComment(query.diary_id, 1, apiName)
  ); // 최신댓글 1개 조회
  logger.debug({
    API: apiName,
    diary_comment: diary_comment,
  });

  // 3. 댓글 갯수
  let comment_count = await mySQLQuery(
    await selectDiaryCommentCount(query.diary_id, apiName)
  );
  logger.debug({
    API: apiName,
    comment_count: comment_count,
  });

  // 댓글이 없는경우 : null 응답
  if (diary_comment[0] == undefined || comment_count[0] == undefined) {
    comment_info = null;
  } else {
    comment_info = {
      comment_id: diary_comment[0].comment_id,
      user_name: diary_comment[0].user_name,
      user_id: query.user_id,
      comment_text: diary_comment[0].comment_text,
      count: comment_count[0].count,
    };
  }

  // 최종응답값에 들어갈 데이터
  return {
    comment_info,
  };
};




/** 일기 상세 조회
 * 1. Like테이블 값 리턴 (like)
 * 2. Diary테이블 값 리턴 (emotion, diary_content)
 * 3. User테이블 값 리턴 (writer(user_name))
 * 4. Comment테이블 값 리턴 (comment_id, user_name, comment_text)
 * 5. Comment테이블 갯수 리턴 (count)
 * 6. DIARY_PHOTO테이블 값 리턴 (photo_id, photo_url)
 */
spaceMng.prototype.getDiaryDetail = async (diaryId, userId, apiName) => {
  // 1. like
  let like = await mySQLQuery(await selectDiaryLike(diaryId, userId, apiName)); // userId: 방문자id
  logger.debug({
    API: apiName,
    like: like,
  });
  if (like.length == 0) {
    like = false;
  } else {
    like = true;
  }

  // 2. emotion, diary_content, select_date
  let emotionAndContent = await mySQLQuery(
    await selectDiaryEmotionAndContent(diaryId, apiName)
  );
  logger.debug({
    API: apiName,
    emotionAndContent: emotionAndContent,
  });
  if (emotionAndContent.length == 0) return 1005;

  // 3. writer
  let writer = await mySQLQuery(await selectDiaryWriter(diaryId, apiName)); // 방문자가 아닌 일기작성자 이름이어야함. 그래서 일기id를 받음
  logger.debug({
    API: apiName,
    writer: writer,
  });
  if (writer.length == 0) return 1005;

  // diary_info 안에 3개값 담기
  diary_info = {
    like: like,
    emotion: emotionAndContent[0].emotion,
    diary_content: emotionAndContent[0].diary_content,
    select_date: emotionAndContent[0].select_date,
    writer: writer[0].writer,
  };
  logger.debug({
    API: apiName,
    diary_info: diary_info,
  });

  // 4. comment_id, user_name, comment_text
  let diary_comment = await mySQLQuery(
    await selectDiaryComment(diaryId, 1, apiName)
  ); // 최신댓글 1개만 조회
  logger.debug({
    API: apiName,
    diary_comment: diary_comment,
  });

  // 5.count
  let count = await mySQLQuery(await selectDiaryCommentCount(diaryId, apiName));
  logger.debug({
    API: apiName,
    count: count,
  });

  // 댓글이 없는경우 : null 응답
  if (diary_comment[0] == undefined || count[0] == undefined) {
    comment_info = null;
  } else {
    comment_info = {
      comment_id: diary_comment[0].comment_id,
      user_name: diary_comment[0].user_name,
      comment_text: diary_comment[0].comment_text,
      count: count[0].count,
    };
  }
  logger.debug({
    API: apiName,
    comment_info: comment_info,
  });

  // 6. photo_id, photo_url
  let diary_photos = await mySQLQuery(
    await selectPhotoByOneDiary(diaryId, apiName)
  );
  logger.debug({
    API: apiName,
    diary_photos: diary_photos,
  });
  // if (diary_photos.length == 0) return 1005; // 조회된 데이터가 없으면 1005 응답

  // 최종 응답값에 필요한 데이터들
  return {
    diary_info,
    comment_info,
    diary_photos,
  };
};

/** 일기 좋아요 등록/해제
 * 1. DB에서 좋아요 조회 (select문)
 * 2. 조회 안 되면 DB에 추가 (insert문)
 * 3. 조회 되면 DB에서 삭제 (delete문)
 */
spaceMng.prototype.setLike = async (diaryId, userId, apiName) => {
  // body(반려견 정보)

  // 1. DB에서 좋아요 조회
  let res = await mySQLQuery(await selectDiaryLike(diaryId, userId, apiName));
  logger.debug({
    API: apiName,
    res: res,
  });

  // 2. 조회된 값이 1개면 delete문
  if (res.length == 1) {
    let res = await mySQLQuery(await removeDiaryLike(diaryId, userId, apiName));
    logger.debug("res %o:" + res);
    return false; // 좋아요(X) 리턴

    // 3. 조회된 값이 0개면 insert문
  } else {
    let res = await mySQLQuery(await addDiaryLike(diaryId, userId, apiName));
    logger.debug({
      API: apiName,
      res: res,
    });
    return true; // 좋아요(O) 리턴
  }
};

/** 일기 수정
 * 0. 미들웨어로 S3에 새로받은 사진 저장하기
 * 1. 사진 수정이 없다면 - DB의 DIARY 테이블만 수정하고 응답
 * 2. 사진 수정이 있다면 - DB의 DIARY 테이블 수정
 * 3. (존재확인 선행) 해당 일기의 DIARY_PHOTO 테이블 삭제
 * 4. (존재확인 선행) 해당 일기의 S3 사진 전체삭제
 * 5. DB DIARY_PHOTO 테이블에 추가하기
 */
spaceMng.prototype.changeDiary = async (query, files, fileInfo, apiName) => {
  // body(일기 정보)

  // 일기정보 수정 (공통)
  let res = await mySQLQuery(await changeDiary(query, apiName));
  logger.debug({
    API: apiName,
    res: res,
  });

  // 1. 사진 수정이 없다면 - 최종응답하기
  if (files.length === 0) {
    logger.debug({
      API: apiName,
      파일유무: '전송한 사진없다-',
      affectedRows: res.affectedRows,
    });
    if (res.affectedRows > 0) {
      return 2000; // 1개 레코드 수정됐으면 성공
    } else {
      return 1005;
    }
  } else {
    logger.debug({
      API: apiName,
      파일유무: '전송한 사진있다-',
      affectedRows: res.affectedRows,
    });
  }

  // ------------------------- 수정 있다면 -------------------------
  // 2-1. 존재유무 확인 - db)url
  let diary_photos = await mySQLQuery(
    await selectPhotoForS3(query.diary_id, apiName)
  );
  logger.debug({
    API: apiName,
    diary_photos: diary_photos,
    diary_photos_length: diary_photos.length,
  });


  // 2-2) 존재유무 확인 - S3사진파일
  if (diary_photos.length != 0) {
    let bucketPathList = [];
    let bucketPathList_exist = [];
    for (let i = 0; i < diary_photos.length; i++) {
      // for문을 사용하여 locations 배열 내의 URL을 하나씩 처리
      bucketPathList.push({
        Bucket: diary_photos[i].bucket,
        Key: diary_photos[i].s3key,
      });
      logger.debug("i :" + i);
      logger.debug("bucketPathList :" + bucketPathList);
    }
  
    // S3에 사진존재하는지 확인하기
    const result = await S3function.checkfileExists(
      s3,
      bucketPathList,
      bucketPathList_exist,
      apiName
    );
    logger.debug({
      API: apiName,
      result: result,
    });
    if (result == 1005) return 1005;
  
    // 3-1) 삭제하기 - 사진URL
    let res_delete_url = await mySQLQuery(
      await removeDiaryPhotoUrls(query.diary_id, apiName)
    );
    logger.debug({
      API: apiName,
      res_delete_url: res_delete_url,
    });
    if (res_delete_url.affectedRows == 0) return 9999; // 삭제실패시 9999 응답
  
    // 3-2) 삭제하기 - S3사진파일
    const res_delete_s3 = await S3function.removeDiaryPhotosFromS3(s3, bucketPathList, apiName);
    logger.debug({
      API: apiName,
      res_delete_s3: res_delete_s3,
    });
    // return res_delete_s3; // 2000 또는 9999
  }
  // return 1005; // 조회된 데이터가 없으면 1005 응답


  // ------------------ 5. DB에 url 저장하기 (여기위치하기 - 삭제후 저장) -------------------
  for (let i = 0; i < fileInfo.locations.length; i++) {
    // for문을 사용하여 locations 배열 내의 URL을 하나씩 처리
    const location = fileInfo.locations[i];
    const bucket = fileInfo.bucket[i];
    const key = fileInfo.key[i];

    let photo_id = await mySQLQuery(
      await addDiaryPhoto(query.diary_id, location, bucket, key, apiName)
    );
    logger.debug({
      API: apiName,
      fileInfo_locations_length: fileInfo.locations.length,
      photo_id: photo_id,
      detail: "DB에 url 저장하기",
    });
    if (!photo_id) return 9999; // 저장안됐으면 9999응답
  }
  return 2000;
};

/** 일기 삭제
 * 1. 일기데이터, 사진URL, S3사진파일 존재유무 확인
 * 2. 전부 존재한다면 하나씩 삭제하기 (안정성)
 */
spaceMng.prototype.removeDiary = async (query, apiName) => {
  // 1-1) 존재유무 확인 - 일기데이터
  let diary_info = await mySQLQuery(await selectDiary(query, apiName));
  logger.debug({
    API: apiName,
    diary_info: diary_info,
  });
  if (!diary_info) return 1005; // 조회된 데이터가 없으면 1005 응답

  // 1-2) 존재유무 확인 - 사진URL
  let diary_photos = await mySQLQuery(
    await selectPhotoForS3(query.diary_id, apiName)
  );
  logger.debug({
    API: apiName,
    diary_photos: diary_photos,
    diary_photos_length: diary_photos.length,
  });
  if (diary_photos.length == 0) return 1005; // 조회된 데이터가 없으면 1005 응답

  // 1-3) 존재유무 확인 - S3사진파일
  let bucketPathList = [];
  let bucketPathList_exist = [];
  for (let i = 0; i < diary_photos.length; i++) {
    // for문을 사용하여 locations 배열 내의 URL을 하나씩 처리
    bucketPathList.push({
      Bucket: diary_photos[i].bucket,
      Key: diary_photos[i].s3key,
    });
    logger.debug({
      API: apiName,
      i: i,
      bucketPathList: bucketPathList,
    });
  }

    // S3에 사진존재하는지 확인하기
    const result = await S3function.checkfileExists(
      s3,
      bucketPathList,
      bucketPathList_exist,
      apiName
    );
  logger.debug({
    API: apiName,
    result: result,
  });
  if (result == 1005) return 1005;

  //---------------------------------------------------------
  // 2-1) 삭제하기 - 일기데이터
  let res_delete = await mySQLQuery(await removeDiary(query.diary_id, apiName));
  logger.debug({
    API: apiName,
    res_delete: res_delete,
  });
  if (res_delete.affectedRows != 1) return 9999; // 삭제실패시 9999 응답

  // 2-2) 삭제하기 - 사진URL
  let res_delete_url = await mySQLQuery(
    await removeDiaryPhotoUrls(query.diary_id, apiName)
  );
  logger.debug({
    API: apiName,
    res_delete_url: res_delete_url,
  });
  if (res_delete_url.affectedRows == 0) return 9999; // 삭제실패시 9999 응답

  // 2-3) 삭제하기 - S3사진파일
  const res_delete_s3 = await S3function.removeDiaryPhotosFromS3(s3, bucketPathList, apiName);
  logger.debug({
    API: apiName,
    res_delete_s3: res_delete_s3,
  });
  return res_delete_s3; // 2000 또는 9999
};

/** 일기 조회
 * 1. DB) DIARY 테이블에서 diary_info 리턴
 * 2. DB) DIARY_PHOTO 테이블에서 URL배열 리턴
 */
spaceMng.prototype.getDiary = async (query, apiName) => {
  // 1. DB) DIARY 테이블에서 diary_info 리턴
  let diary_info = await mySQLQuery(await selectDiary(query, apiName));
  logger.debug({
    API: apiName,
    diary_info: diary_info,
  });
  if (!diary_info) return 1005; // 조회된 데이터가 없으면 1005 응답

  // 2. DB) DIARY_PHOTO 테이블에서 URL배열 리턴
  let diary_photos = await mySQLQuery(
    await selectPhotoByOneDiary(query.diary_id, apiName)
  );
  logger.debug({
    API: apiName,
    diary_photos: diary_photos,
  });
  if (diary_photos.length == 0) return 1005; // 조회된 데이터가 없으면 1005 응답

  // API성공 시) 원하는 출력 모양을 추가함
  return {
    diary_info: diary_info[0],
    diary_photos: diary_photos,
  };
};

/** 일기 등록
 * 1. space id 존재유무 조회
 * 2. DB) 파라미터들 DIARY 테이블에 저장
 * 3. DB) 사진들 DIARY_PHOTO 테이블에 하나씩 저장
 * 4. 로직2, 로직3 성공해야 diary_id 응답하기
 */
spaceMng.prototype.addDiary = async (query, fileInfo, apiName) => {
  // 1. 추억공간 조회
  const find_space = await mySQLQuery(
    await selectSpace(query.space_id, apiName)
  );
  logger.debug({
    API: apiName,
    find_space_length: find_space.length,
  });
  if (find_space.length != 1) return 1005; // 추억공간이 조회안된다면 다음 로직안넘어가고 1005 응답으로 끝냄

  // 2. DB) 파라미터들 DIARY 테이블에 저장
  let diary_id = await mySQLQuery(await addDiary(query, apiName));
  diary_id = diary_id.insertId; // diary_id만 추출
  logger.debug({
    API: apiName,
    diary_id: diary_id,
  });
  if (!diary_id) return 9999; // 저장안됐으면 9999응답

  // 3. DB) 사진들 DIARY_PHOTO 테이블에 하나씩 저장
  for (let i = 0; i < fileInfo.locations.length; i++) {
    // for문을 사용하여 locations 배열 내의 URL을 하나씩 처리
    const location = fileInfo.locations[i];
    const bucket = fileInfo.bucket[i];
    const key = fileInfo.key[i];

    let photo_id = await mySQLQuery(
      await addDiaryPhoto(diary_id, location, bucket, key, apiName)
    );
    logger.debug({
      API: apiName,
      photo_id: photo_id,
    });
    if (!photo_id) return 9999; // 저장안됐으면 9999응답
  }

  // 4. diary_id 응답하기
  return diary_id;
};



/** 타임라인 반려견 프사 수정 */
spaceMng.prototype.setDogImg = async (query, url, apiName) => {
  try {
    logger.debug({
      API: apiName,
      params: query,
      url: url,
    });
    // 유저정보 수정 쿼리문 날리기
    const res = await mySQLQuery(changeDog_img(query, url, apiName));
    logger.debug({
      API: apiName,
      res: res,
    });

    if (res.changedRows == 1) return 2000;
    else return 1005;
  } catch (error) {
    logger.error({
      API: apiName,
      error: error,
    });
    return 9999;
  }
};

/** 타임라인 조회2
*/
// spaceMng.prototype.getTimeline = async (query, apiName) => {
//   // 1. DB) DOG 테이블에서 dog_info 리턴
//   let dog_info = await mySQLQuery(await selectDogInfo(query, apiName));
//   logger.debug({
//     API: apiName,
//     dog_info: dog_info,
//   });
//   if (!dog_info) return 1005; // 조회된 데이터가 없으면 1005 응답


//   // 함수를 호출하여 결과를 확인합니다.
//   let nextPage;
//   let page_num = query.page_num;
//   let startAndEndDates = printDates(page_num, query.year, query.month); // 그 다음 7일치 날짜 출력
//   let day1 = new Date(query.year, query.month-1, '02');
//   startDate_day1 = day1.getFullYear() + '-' + String(day1.getMonth() + 1).padStart(2, '0') + '-' + '01';

//   logger.debug({
//     API: apiName,
//     startAndEndDates: startAndEndDates,
//     printDates시작일: startAndEndDates[0],
//     printDates종료일: startAndEndDates[1],
//     printDates다음페이지: startAndEndDates[2],
//     startDate_day1: startDate_day1,
//   });

//   // 3. DB) 일기 데이터 얻기
//   let diary_info = await mySQLQuery(await selectDiaryInfo(query, startAndEndDates[1], startAndEndDates[0], apiName));
//   logger.debug({
//     API: apiName,
//     firstDiary_info: diary_info,
//     diary_infolength: diary_info.length,
//   });


//   // 1일까지 반복문 돌리기
//   let stopLoop = false; // for문을 멈출 조건을 나타내는 변수
//   for (let i = 0; !stopLoop; i++) { // diary_info의 길이가 1이면
//     // 일기값이 있으면
//       // 그 일기값 리턴
//       // nextpage 조회
//     // 없으면
//       // info 임시일기값 리턴
//       // nextpage 조회
//     page_num ++;
//     임시startAndEndDates = printDates(page_num, query.year, query.month); // 그 다음 7일치 날짜 출력
//     임시info = await mySQLQuery(await selectDiaryInfo(query, 임시startAndEndDates[1], 임시startAndEndDates[0], apiName));
//     logger.debug({
//       for문i: i,
//       일기: 임시info,
//       일기length: 임시info.length,
//       임시startAndEndDates1: 임시startAndEndDates[1],
//       임시startAndEndDates0: 임시startAndEndDates[0],
//       startDate_day1: startDate_day1,
//       stopLoop: stopLoop,
//     });
//     if (임시startAndEndDates[2] === 0 || 임시info.length != 0) { // 루프문제 해결
//       stopLoop = true; // "nextPage": 0이면 for문을 멈춘다.
//     }
//   }


//   // 일기데이터가 있으면 그 데이터 응답, nextpage 조회
//   if (diary_info.length != 0) {
//     if (임시info.length === 0) {
//       nextPage = 0;
//       logger.debug(9994);
//     } else {
//       nextPage = startAndEndDates[2]
//       logger.debug(9993);
//     }

//     if (임시startAndEndDates[1] == startDate_day1) {
//       nextPage = 0;
//       logger.debug(9995);
//     }
//   } else {
//     diary_info = 임시info;

//     if (임시startAndEndDates[1] == startDate_day1) {
//       nextPage = 0;
//       logger.debug(9992);
//     } else {
//       nextPage = startAndEndDates[2]
//       logger.debug(9991);
//     }
//   }


//   // 변환된 데이터를 저장할 빈 객체
//   const diaryInfo = {};
//   let arrPhoto = [];
//   let diaryID = 0;

//   // diary_info 배열을 순회
//   for (const [index, result] of diary_info.entries()) {
//     const { diary_id, diary_content, photo_url, select_date, user_name, user_prof_img } = result;
//     logger.debug(`${index}`);
//     logger.debug(`${photo_url}`);
//     logger.debug(`${diaryID}`);
//     logger.debug(`${diary_id}`);
    
//     // 날짜를 가진 객체를 찾거나 만듦
//     if (!diaryInfo[select_date]) {
//       diaryInfo[select_date] = [];
//     }
    
//     // 재료
//     // 같은 일기가 아니라면
//     if (diaryID != diary_id) {
//       logger.debug(`초기화%%%%%%%%%%%%%`);
//       arrPhoto = [];
//     }
//     arrPhoto.push(photo_url);
//     logger.debug(`*********arrPhoto : ${arrPhoto}`);

//     aa = {
//       user_name,
//       user_prof_img,
//       diary_content,
//       photos : [], // 사진만 배열로 만들기 (제일 작은 단위)
//     };
//     bb = [];
//     bb.push(aa);
//     cc = { // 일기 id로 감싸기
//       [diary_id]: aa
//     };


//     // 날짜 안에 일기 데이터가 없다면
//     if (!diaryInfo[select_date][0]) { // 일기데이터 추가하기(사진 포함) //
//       diaryInfo[select_date].push(cc); // 객체를 통째로 추가
//     }

//     diaryInfo[select_date][0][diary_id] = bb;
//     diaryInfo[select_date][0][diary_id][0]["photos"] = arrPhoto;
//     diaryID = diary_id;
//   };

//   // // diaryInfo가 비어있으면 1005응답하기 (우혁 요청)
//   // if (Object.keys(diaryInfo).length === 0) {
//   //   return 1005;
//   // }
//   // 주석 이유 : 7일이상 일기가없으면 페이지가 생성이 안 되는 문제발생

//   // 4. 안 읽은 알림 갯수 조회
//   let count = await mySQLQuery(await selectUnreadNoticeCount(query.dog_id, apiName));
//   const notice_count = count[0].count;

//   return {
//     notice_count,
//     dog_info: dog_info,
//     diary_info: diaryInfo,
//     nextPage: nextPage,
//   }; // 원하는 출력 모양을 추가함
// };


/** 타임라인 조회 - 포인터로 해당데이터 + 위아래데이터 가져오기
 */
spaceMng.prototype.getTimelineForUpOrDown = async (query, apiName) => {


  // 1. DB) DOG 테이블에서 dog_info 리턴
  // let dog_info = await mySQLQuery(await selectDogInfo(query, apiName));
  // logger.debug({
  //   API: apiName,
  //   dog_info: dog_info,
  // });
  // if (!dog_info) return 1005; // 조회된 데이터가 없으면 1005 응답

  
  // 숫자로변환
  const year = Number(query.year);
  const month = Number(query.month);
  const diary_id = Number(query.diary_id);
  logger.debug({
    API: apiName,
    yearrr: year,
    monthhh: month,
    diary_id: diary_id,
  });

  // 함수를 호출하여 결과를 확인합니다.
  let day1 = new Date(query.year, query.month-1, '02'); 
  let day2 = new Date(query.year, query.month, 0); 
  startDate_day1 = day1.getFullYear() + '-' + String(day1.getMonth() + 1).padStart(2, '0') + '-' + '01';
  startDate_day2 = day2.getFullYear() + '-' + String(day2.getMonth() + 1).padStart(2, '0') + '-' + day2.getDate();

  logger.debug({
    API: apiName,
    startDate_day1: startDate_day1,
    startDate_day2: startDate_day2,
  });

  // 3. DB) 일기 데이터 얻기
  let origin_diary_info = await mySQLQuery(await selectDiaryInfo(query, startDate_day1, startDate_day2, apiName));
  logger.debug({
    API: apiName,
    firstDiary_info: origin_diary_info,
    diary_infolength: origin_diary_info.length,
    diary_infolength000: origin_diary_info[origin_diary_info.length-1].diary_id, // 194
  });


  const limit = Number(TIMELINE_LIMIT) // 5
  let startIdx;
  let endIdx;
  for (let i = 0; i < origin_diary_info.length; i++) {
    const diary = origin_diary_info[i];
    logger.debug(i)
    logger.debug(diary.diary_id)
    
    if (diary.diary_id == query.diary_id) {
      logger.debug('slice')
      startIdx = i - limit;
      endIdx = i + limit;
      if (startIdx < 0) startIdx = 0;
      if (endIdx > origin_diary_info.length) endIdx = origin_diary_info.length;
      diary_info = origin_diary_info.slice(startIdx, endIdx);
      i = origin_diary_info.length + 1; // 탈출
    }
  }


  // 실제 응답할 데이터 x
  let nextPageDown = 0;
  let nextPageUp = 0;
  if (startIdx != 0) {
    nextPageUp = 1
  } 
  if (endIdx != origin_diary_info.length) {
    nextPageDown = 1
  } 
  logger.debug({
    API: apiName,
    startIdx: startIdx,
    endIdx: endIdx,
    origin_diary_infolength: origin_diary_info.length,
    infostartIdx: origin_diary_info[startIdx],
    infoendIdx: origin_diary_info[endIdx],
    nextPageDown: nextPageDown, // 194
    nextPageUp: nextPageUp, // 194
  });



  // 변환된 데이터를 저장할 빈 객체
  const diaryInfo = {};
  let arrPhoto = [];
  let diaryID = 0;

  // diary_info 배열을 순회
  for (const [index, result] of diary_info.entries()) {
    const { diary_id, diary_content, photo_url, select_date, user_name, user_prof_img } = result;
    logger.debug(`${index}`);
    logger.debug(`${photo_url}`);
    logger.debug(`${diaryID}`);
    logger.debug(`${diary_id}`);
    
    // 날짜를 가진 객체를 찾거나 만듦
    if (!diaryInfo[select_date]) {
      diaryInfo[select_date] = [];
    }
    
    // 재료
    // 같은 일기가 아니라면
    if (diaryID != diary_id) {
      logger.debug(`초기화%%%%%%%%%%%%%`);
      arrPhoto = [];
    }
    // arrPhoto.push(photo_url);
    logger.debug(`*********arrPhoto : ${arrPhoto}`);

    aa = { 
      user_name,
      user_prof_img,
      diary_content,
      photos : [], // 사진만 배열로 만들기 (제일 작은 단위)
    };
    bb = [];
    bb.push(aa);
    cc = { // 일기 id로 감싸기
      [diary_id]: aa
    }; 


    // 날짜 안에 일기 데이터가 없다면
    if (!diaryInfo[select_date][0]) { // 일기데이터 추가하기(사진 포함) //
      diaryInfo[select_date].push(cc); // 객체를 통째로 추가
    } 

    diaryInfo[select_date][0][diary_id] = bb;
    diaryInfo[select_date][0][diary_id][0]["photos"] = arrPhoto;
    diaryID = diary_id;
  };


  // // 4. 안 읽은 알림 갯수 조회
  // let count = await mySQLQuery(await selectUnreadNoticeCount(query.dog_id, apiName));
  // const notice_count = count[0].count;

  return {
    // notice_count,
    // dog_info: dog_info,
    diary_info: diary_info,
    nextPageUp: nextPageUp,
    nextPageDown: nextPageDown,
  }; // 원하는 출력 모양을 추가함
};



/** 타임라인 조회 - 포인터로 해당데이터 + 위아래데이터 가져오기
 */
spaceMng.prototype.getTimelineForPointer = async (query, apiName) => {


  // 1. DB) DOG 테이블에서 dog_info 리턴
  // let dog_info = await mySQLQuery(await selectDogInfo(query, apiName));
  // logger.debug({
  //   API: apiName,
  //   dog_info: dog_info,
  // });
  // if (!dog_info) return 1005; // 조회된 데이터가 없으면 1005 응답

  
  // 숫자로변환
  const year = Number(query.year);
  const month = Number(query.month);
  const diary_id = Number(query.diary_id);
  logger.debug({
    API: apiName,
    yearrr: year,
    monthhh: month,
    diary_id: diary_id,
  });

  // 함수를 호출하여 결과를 확인합니다.
  let day1 = new Date(query.year, query.month-1, '02'); 
  let day2 = new Date(query.year, query.month, 0); 
  startDate_day1 = day1.getFullYear() + '-' + String(day1.getMonth() + 1).padStart(2, '0') + '-' + '01';
  startDate_day2 = day2.getFullYear() + '-' + String(day2.getMonth() + 1).padStart(2, '0') + '-' + day2.getDate();

  logger.debug({
    API: apiName,
    startDate_day1: startDate_day1,
    startDate_day2: startDate_day2,
  });

  // 3. DB) 일기 데이터 얻기
  let origin_diary_info = await mySQLQuery(await selectDiaryInfo(query, startDate_day1, startDate_day2, apiName));
  logger.debug({
    API: apiName,
    firstDiary_info: origin_diary_info,
    diary_infolength: origin_diary_info.length,
    diary_infolength000: origin_diary_info[origin_diary_info.length-1].diary_id, // 194
  });


  const limit = Number(TIMELINE_LIMIT) // 5
  let startIdx;
  let endIdx;
  for (let i = 0; i < origin_diary_info.length; i++) {
    const diary = origin_diary_info[i];
    logger.debug(i)
    logger.debug(diary.diary_id)
    
    if (diary.diary_id == query.diary_id) {
      logger.debug('slice')
      startIdx = i - limit;
      endIdx = i + limit;
      if (startIdx < 0) startIdx = 0;
      if (endIdx > origin_diary_info.length) endIdx = origin_diary_info.length;
      diary_info = origin_diary_info.slice(startIdx, endIdx);
      i = origin_diary_info.length + 1; // 탈출
    }
  }


  // 실제 응답할 데이터 x
  let nextPageDown = 0;
  let nextPageUp = 0;
  if (startIdx != 0) {
    nextPageUp = 1
  } 
  if (endIdx != origin_diary_info.length) {
    nextPageDown = 1
  } 
  logger.debug({
    API: apiName,
    startIdx: startIdx,
    endIdx: endIdx,
    origin_diary_infolength: origin_diary_info.length,
    infostartIdx: origin_diary_info[startIdx],
    infoendIdx: origin_diary_info[endIdx],
    nextPageDown: nextPageDown, // 194
    nextPageUp: nextPageUp, // 194
  });



  // 변환된 데이터를 저장할 빈 객체
  const diaryInfo = {};
  let arrPhoto = [];
  let diaryID = 0;

  // diary_info 배열을 순회
  for (const [index, result] of diary_info.entries()) {
    const { diary_id, diary_content, photo_url, select_date, user_name, user_prof_img } = result;
    logger.debug(`${index}`);
    logger.debug(`${photo_url}`);
    logger.debug(`${diaryID}`);
    logger.debug(`${diary_id}`);
    
    // 날짜를 가진 객체를 찾거나 만듦
    if (!diaryInfo[select_date]) {
      diaryInfo[select_date] = [];
    }
    
    // 재료
    // 같은 일기가 아니라면
    if (diaryID != diary_id) {
      logger.debug(`초기화%%%%%%%%%%%%%`);
      arrPhoto = [];
    }
    // arrPhoto.push(photo_url);
    logger.debug(`*********arrPhoto : ${arrPhoto}`);

    aa = { 
      user_name,
      user_prof_img,
      diary_content,
      photos : [], // 사진만 배열로 만들기 (제일 작은 단위)
    };
    bb = [];
    bb.push(aa);
    cc = { // 일기 id로 감싸기
      [diary_id]: aa
    }; 


    // 날짜 안에 일기 데이터가 없다면
    if (!diaryInfo[select_date][0]) { // 일기데이터 추가하기(사진 포함) //
      diaryInfo[select_date].push(cc); // 객체를 통째로 추가
    } 

    diaryInfo[select_date][0][diary_id] = bb;
    diaryInfo[select_date][0][diary_id][0]["photos"] = arrPhoto;
    diaryID = diary_id;
  };


  // 4. 안 읽은 알림 갯수 조회
  let count = await mySQLQuery(await selectUnreadNoticeCount(query.dog_id, apiName));
  const notice_count = count[0].count;

  return {
    notice_count,
    // dog_info: dog_info,
    diary_info: diaryInfo,
    nextPageUp: nextPageUp,
    nextPageDown: nextPageDown,
  }; // 원하는 출력 모양을 추가함
};


/** 타임라인 조회1
 */
spaceMng.prototype.getDateForMonthOnExist = async (query, apiName) => {


  // 함수를 호출하여 결과를 확인합니다.
  let day1 = new Date(query.year, query.month-1, '02'); 
  let day2 = new Date(query.year, query.month, 0); 
  startDate_day1 = day1.getFullYear() + '-' + String(day1.getMonth() + 1).padStart(2, '0') + '-' + '01';
  startDate_day2 = day2.getFullYear() + '-' + String(day2.getMonth() + 1).padStart(2, '0') + '-' + day2.getDate();

  logger.debug({
    API: apiName,
    day1: day1,
    day2: day2,
    startDate_day1: startDate_day1,
    startDate_day2: startDate_day2,
  });

  // 3. DB) 일기 데이터 얻기
  let diary_info = await mySQLQuery(await selectDateInfo(query, startDate_day1, startDate_day2, apiName));
  logger.debug({
    API: apiName,
    diary_info: diary_info,
    diary_infolength: diary_info.length,
  });


  // 변환된 데이터를 저장할 빈 객체
  const diaryInfo = {};
  let arrPhoto = [];
  let diaryID = 0;

  // diary_info 배열을 순회
  for (const [index, result] of diary_info.entries()) {
    const { diary_id, diary_content, photo_url, select_date, user_name, user_prof_img } = result;
    logger.debug(`${index}`);
    logger.debug(`${photo_url}`);
    logger.debug(`${diaryID}`);
    logger.debug(`${diary_id}`);
    
    // 날짜를 가진 객체를 찾거나 만듦
    if (!diaryInfo[select_date]) {
      diaryInfo[select_date] = [];
    }
    
    // 재료
    // 같은 일기가 아니라면
    if (diaryID != diary_id) {
      logger.debug(`초기화%%%%%%%%%%%%%`);
    }

    aa = {diary_id};
    bb = [];
    bb.push(aa);
    cc = { // 일기 id로 감싸기
      [diary_id]: aa
    }; 


    // 날짜 안에 일기 데이터가 없다면
    if (!diaryInfo[select_date][0]) { // 일기데이터 추가하기(사진 포함) //
      diaryInfo[select_date].push(cc); // 객체를 통째로 추가
    } 

    diaryInfo[select_date][0][diary_id] = bb;
    diaryID = diary_id;
  };


  return {
    diary_info: diaryInfo,
  }; // 원하는 출력 모양을 추가함
};




/** 추억공간 배경사진 수정 
   - DOG 테이블에 반려견 배경사진 수정
*/
spaceMng.prototype.changeBackgroundImg = async (
  query,
  file_location,
  apiName
) => {
  // body(반려견 정보)
  logger.debug({
    API: apiName,
    params: query,
    file_location: file_location,
  });

  // DOG 테이블에 배경사진 수정
  let res = await mySQLQuery(
    await changeBackgroundImg(query, file_location, apiName)
  );
  logger.debug({
    API: apiName,
    res: res,
  });

  if (res.changedRows == 1) {
    // 변경된값이 1개면 성공
    return 2000;
  } else {
    // 변경된값이 없음
    return 1005;
  }
};

/** 추억공간 배경사진 수정 
   - DOG 테이블에 반려견 배경사진 수정
*/
spaceMng.prototype.changeBackgroundImg = async (
  query,
  file_location,
  apiName
) => {
  // body(반려견 정보)
  logger.debug({
    API: apiName,
    params: query,
    file_location: file_location,
  });

  // DOG 테이블에 배경사진 수정
  let res = await mySQLQuery(
    await changeBackgroundImg(query, file_location, apiName)
  );
  logger.debug({
    API: apiName,
    res: res,
  });

  if (res.changedRows == 1) {
    // 변경된값이 1개면 성공
    return 2000;
  } else {
    // 변경된값이 없음
    return 1005;
  }
};

/** 추억공간 & 반려견 정보 삭제 (추후 사진삭제예정)
 * 1. 추억공간 조회
 * 2. DOG 조회
 * 3. 추억공간 삭제
 * 4. DOG 삭제
 */
spaceMng.prototype.removeSpace = async (query, apiName) => {
  // 1. 추억공간 조회
  const find_space = await mySQLQuery(
    await selectSpace(query.space_id, apiName)
  );
  logger.debug({
    API: apiName,
    find_space_length: find_space.length,
    find_space_dog_id: find_space[0].dog_id,
  });
  const dog_id = find_space[0].dog_id;

  // 2. DOG 조회
  let find_dog = await mySQLQuery(await selectDog(dog_id, apiName));
  logger.debug({
    API: apiName,
    find_dog_length: find_dog.length,
    detail: "find_dog.length 1이어야함",
  });

  // 둘 다 조회되어야 삭제하기
  if (find_space.length == 1 && find_dog.length == 1) {
    // 3. 추억공간 삭제
    let res_space = await mySQLQuery(
      await removeSpace(query.space_id, apiName)
    );
    logger.debug({
      API: apiName,
      res_space_affectedRows: res_space.affectedRows,
      detail: "res_space.affectedRows 1이어야함",
    });

    // 4. DOG 삭제
    let res_dog = await mySQLQuery(await removeDog(dog_id, apiName));
    logger.debug({
      API: apiName,
      res_dog_affectedRows: res_dog.affectedRows,
      detail: "res_dog.affectedRows 1이어야함",
    });

    // 둘 다 삭제되어야 2000응답
    if (res_space.affectedRows == 1 && res_dog.affectedRows == 1) {
      return 2000;
    } else {
      return 9999;
    }
  } else {
    return 1005;
  }
};

/** 추억공간 반려견 정보 조회
   - DOG 테이블 반려견 정보 조회
*/
spaceMng.prototype.getDogInfo = async (dog_id, apiName) => {
  // DOG 테이블 반려견 정보 조회
  let res = await mySQLQuery(await selectDog(dog_id, apiName));
  logger.debug({
    API: apiName,
    res: res,
    res_length: res.length,
  });

  if (res.length == 1) {
    // 조회된 강아지가 1마리인 경우
    return res;
  } else {
    // 1마리가 아닌 경우
    return 1005;
  }
};

/** 추억공간 수정 
   - DOG 테이블에 반려견 정보 수정
*/
spaceMng.prototype.changeDog = async (query, file_location, apiName) => {
  // body(반려견 정보)

  // DOG 테이블에 반려견 정보 수정
  let res = await mySQLQuery(await changeDog(query, file_location, apiName));
  logger.debug({
    API: apiName,
    res: res,
  });

  if (res.changedRows > 0) {
    // 변경된값이 1개 이상임
    return 2000;
  } else {
    // 변경된값이 없음
    return 1005;
  }
};

/** 추억공간 생성
 * 1. 이메일로 user_id 응답받기
 * 2. DOG 테이블에 반려견 정보 저장
 * 3. MEMORY_SPACE 테이블에 user_id, dog_id값 저장
 */
spaceMng.prototype.addSpace = async (query, file_location, apiName) => {
  // 1. 이메일로 user_id 응답받기
  let user_id = await mySQLQuery(await getUserId(query.user_email, apiName)); // email -> user_id
  if (!user_id[0]) return 1005; // 없는 이메일 예외처리
  user_id = user_id[0].user_id; // user_id만 추출
  logger.debug({
    API: apiName,
    user_id: user_id,
  });

  // 2. DOG 테이블에 반려견 정보 저장
  let dog_id = await mySQLQuery(
    await addDog(user_id, query, file_location, apiName)
  );
  dog_id = dog_id.insertId; // dog_id만 추출
  logger.debug({
    API: apiName,
    dog_id: dog_id,
  });

  // 3. MEMORY_SPACE 테이블에 user_id, dog_id값 저장
  let space_id = await mySQLQuery(await addSpace(user_id, dog_id, apiName)); // + bkg_img_url 파라미터 추가하기
  space_id = space_id.insertId; // space_id만 추출

  // API성공 시) 원하는 출력 모양을 추가함
  return {
    space_id: space_id,
    dog_id: dog_id,
  };
};

//------------------------- 함수 -------------------------
// 페이지 번호를 인자로 받아 해당 페이지에 해당하는 일주일을 출력하는 함수입니다.
function printDates(page_num, year, month) {

  
  // 일단, 오늘 날짜를 2023년 11월 8일로 설정합니다.
  let today = new Date(); // 월은 0부터 시작하므로 11월은 10입니다.
  
  // 요청하는 데이터가 이번달인 경우
  logger.debug({
    year: year,
    month: month,
    getFullYear: today.getFullYear(),
    getMonth: today.getMonth() + 1,
  });


  // 당월
  if (today.getFullYear() == year && today.getMonth() + 1 == month) { 
    startDate = new Date(today);
    startDate.setDate(today.getDate() - ((page_num - 1) * 7));
    // 출력할 날짜 범위의 마지막 날짜는 오늘 날짜에서 (페이지 번호-1)*7일을 뺀 날입니다.
    logger.debug({
      today: '요청데이터가 이번달이다.',
      startDate: startDate,
      startDate: formatDate(startDate),
    });

  // 이전월
  } else {
    startDate = new Date(year, month, 0); // 0:마지막일
    startDate.setDate(startDate.getDate() - ((page_num - 1) * 7));
    
    logger.debug({
      today: '요청데이터가 이번달이 아니다.',
      startDate: startDate,
      startDate: formatDate(startDate),
    });
  }
  logger.debug({
    today: 'if문 바져나옴',
    startDate: startDate,
    startDate: formatDate(startDate),
    getDate: startDate.getDate(),
  });

  // 출력할 날짜 범위의 첫 날짜는 마지막 날짜에서 6일을 뺀 날입니다.
  let endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() - 6);


  // 시작일과 종료일이 다른 달에 속한다면, 종료일은 시작일이 속한 달의 첫 날이 됩니다.
  nextPage = page_num;
  nextPage++;
  if (startDate.getMonth() !== endDate.getMonth() || endDate.getDate() == 1) {
    endDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    nextPage = 0; // 다음페이지 없다는 뜻으로 응답하기
  }

  // 시작일과 종료일을 문자열 형태로 변환하여 배열에 저장합니다.
  let dates = [formatDate(startDate), formatDate(endDate), nextPage];

  // 배열에 저장된 날짜들을 콘솔에 출력합니다.
  return dates
}




// Date 객체 to 'yyyy-mm-dd' 함수
function formatDate(date) {
  let dd = String(date.getDate()).padStart(2, '0');
  let mm = String(date.getMonth() + 1).padStart(2, '0'); // January is 0!
  let yyyy = date.getFullYear();
  return yyyy + '-' + mm + '-' + dd;
}

// 날짜 문자열 함수
function formattedDate(year, month, apiName) {
  // 2023, 10

  // 해당 월의 마지막 날짜 구하기
  const lastDay = new Date(year, month, 0).getDate();

  // 'YYYY-MM-DD' 형식의 날짜 생성
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(
    lastDay
  ).padStart(2, "0")}`;
  logger.debug({
    API: apiName,
    startDate: startDate, // 출력: '2023-09-01'
    endDate: endDate, // 출력: '2023-09-30'
    function: "formattedDate()",
  });

  return {
    startDate,
    endDate,
  };
}

//------------------------- 쿼리 -------------------------

// 알림 읽음처리 쿼리문 작성
function changeComment_isRead(comment_id, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    comment_id: comment_id,
    function: "changeComment_isRead()",
  });

  return {
    text: `UPDATE COMMENT
            SET is_read = true
            WHERE comment_id = ?`,
    params: [comment_id],
  };
}


// 안 읽은 알림 갯수조회 쿼리문 작성
async function selectUnreadNoticeCount(space_id, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    space_id: space_id,
    function: "selectUnreadNoticeCount()",
  });

  return {
    text: `SELECT COUNT(*) AS count
            FROM COMMENT AS C
            INNER JOIN DIARY as D on C.diary_id = D.diary_id
            INNER JOIN USER AS U ON C.user_id = U.user_id
            WHERE D.space_id = ? and C.is_read = false AND U.user_id != (
                SELECT user_id
                FROM DIARY
                WHERE space_id = ?
                LIMIT 1
              )
        `,
    params: [space_id, space_id],
  };
}

// 알림 상세 조회 쿼리문 작성
async function selectCommentInfo(space_id, limit, offset, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    space_id: space_id,
    limit: limit,
    offset: offset,
    function: "selectCommentInfo()",
  });

  return {
    text: `SELECT U.user_id, C.comment_id, U.user_name, U.user_prof_img, SUBSTRING(C.comment_text, 1, 25) AS comment_text, DATE_FORMAT(C.create_at, '%Y-%m-%d') AS select_date, 
    CASE WHEN C.is_read = 1 THEN 'true' ELSE 'false' END AS is_read,
    SUBSTRING(D.diary_content, 1, 25) AS diary_content, D.diary_id
              FROM COMMENT AS C
              INNER JOIN USER AS U ON C.user_id = U.user_id
              INNER JOIN DIARY as D on C.diary_id = D.diary_id
              WHERE D.space_id = ? AND U.user_id != (
                SELECT user_id
                FROM DIARY
                WHERE space_id = ?
                LIMIT 1
              )
              ORDER BY C.create_at ASC
              LIMIT ? OFFSET ?; 
        `, // LIMIT 20 : 20개씩
           // OFFSET 20 : 시작지점 (0부터)
    params: [space_id, space_id, limit, offset],
  };
}


// 반려견 프사 수정 쿼리문 작성
function changeDog_img(query, url, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    url: url,
    function: "changeDog_img()",
  });

  return {
    text: `UPDATE DOG
                SET dog_prof_img = ?
                WHERE dog_id = ?`,
    params: [url, query.dog_id],
  };
}

// 일기 삭제 쿼리문 작성
async function removeTheDiaryComment(comment_id, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    comment_id: comment_id,
    function: "removeTheDiaryComment()",
  });

  return {
    text: `DELETE FROM COMMENT
                WHERE comment_id = ? `,
    params: [comment_id],
  };
}

// 일기 댓글 수정 쿼리문 작성
async function changeComment(query, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    function: "changeComment()",
  });

  return {
    text: `UPDATE COMMENT 
                SET comment_text = ?,
                update_at = now()
                WHERE comment_id = ? `,
    params: [query.comment_text, query.comment_id],
  }; // 파라미터 4개
}

// 일기 댓글 작성 쿼리문 작성
async function addComment(query, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    function: "addComment()",
  });

  return {
    // 컬럼 4개
    text: `INSERT INTO COMMENT 
                (user_id, diary_id, comment_text, is_read, create_at) 
                VALUES (?, ?, ?, false, now())`,
    params: [query.user_id, query.diary_id, query.comment_text],
  };
}

// 일기 댓글 갯수조회 쿼리문 작성
async function selectDiaryCommentCount(diary_id, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    diary_id: diary_id,
    function: "selectDiaryCommentCount()",
  });

  return {
    text: `SELECT COUNT(*) AS count
                FROM COMMENT
                WHERE COMMENT.diary_id = ?;
        `,
    params: [diary_id],
  };
}

// 일기 해당 댓글 조회 쿼리문 작성
async function selectTheDiaryComment(comment_id, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    comment_id: comment_id,
    function: "selectTheDiaryComment()",
  });

  return {
    text: `SELECT COMMENT.comment_id, USER.user_name, USER.user_id, COMMENT.comment_text
                FROM COMMENT
                INNER JOIN USER ON COMMENT.user_id = USER.user_id
                WHERE COMMENT.comment_id = ? ; 
        `,
    params: [comment_id],
  };
}

// 일기 댓글 조회 쿼리문 작성
async function selectDiaryComment(diaryId, limit, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    diaryId: diaryId,
    limit: limit,
    function: "selectDiaryComment()",
  });

  return {
    text: `SELECT COMMENT.comment_id, USER.user_name, USER.user_id, COMMENT.comment_text
                FROM COMMENT
                INNER JOIN USER ON COMMENT.user_id = USER.user_id
                WHERE diary_id = ?
                ORDER BY COMMENT.create_at DESC
                LIMIT ?; 
        `,
    params: [diaryId, limit],
  };
}

// 일기 작성자 조회 쿼리문 작성
async function selectDiaryWriter(diaryId, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    diaryId: diaryId,
    function: "selectDiaryWriter()",
  });

  return {
    text: `SELECT user_name as writer 
                FROM USER
                WHERE user_id = (
                    SELECT m.user_id
                    FROM DIARY as d
                    LEFT JOIN MEMORY_SPACE as m on m.space_id = d.space_id
                    WHERE diary_id = ?
                )
        `,
    params: [diaryId],
  };
}

// 일기 감정,내용 조회 쿼리문 작성
async function selectDiaryEmotionAndContent(diaryId, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    diaryId: diaryId,
    function: "selectDiaryEmotionAndContent()",
  });

  return {
    text: `SELECT emotion, diary_content, DATE_FORMAT(select_date, '%Y-%m-%d') AS select_date 
                FROM DIARY 
                WHERE diary_id = ?;
        `,
    params: [diaryId],
  };
}

// 일기 좋아요 해제 쿼리문 작성
async function removeDiaryLike(diaryId, userId, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    diaryId: diaryId,
    userId: userId,
    function: "removeDiaryLike()",
  });

  return {
    text: `DELETE FROM rb2web.LIKE
                WHERE diary_id = ? and user_id = ?`,
    params: [diaryId, userId],
  };
}

// 일기 좋아요 등록 쿼리문 작성
async function addDiaryLike(diaryId, userId, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    diaryId: diaryId,
    userId: userId,
    function: "addDiaryLike()",
  });

  return {
    // 컬럼 6개
    text: `INSERT INTO rb2web.LIKE 
                (diary_id, user_id, create_at) 
                VALUES (?, ?, now() )`,
    params: [diaryId, userId],
  };
}

// 일기 좋아요 조회 쿼리문 작성
async function selectDiaryLike(diaryId, userId, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    diaryId: diaryId,
    userId: userId,
    function: "selectDiaryLike()",
  });

  return {
    text: `SELECT * 
                FROM rb2web.LIKE 
                WHERE diary_id = ? and user_id = ?;
        `,
    params: [diaryId, userId],
  };
}

// 일기 데이터 조회 쿼리문 작성
async function selectDateInfo(query, startDate, EndDate, apiName) {
  logger.debug(`space_id값 얻은 후 사진조회 쿼리문 작성`);
  logger.debug("query %o:" + query);
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    startDate: startDate,
    EndDate: EndDate,
    function: "selectDateInfo()",
  });

  return {
    text: `SELECT D.diary_id, DATE_FORMAT(D.select_date, '%Y-%m-%d') AS select_date
            FROM DIARY AS D
            LEFT JOIN DIARY_PHOTO AS P ON D.diary_id = P.diary_id
            LEFT JOIN USER AS U ON D.user_id = U.user_id
            WHERE D.space_id = (SELECT space_id FROM MEMORY_SPACE WHERE dog_id = ? )
            AND D.select_date >= ? AND D.select_date <= ?
            ORDER BY D.select_date DESC, D.diary_id ASC
            `,
    params: [query.dog_id, startDate, EndDate],
  };
}

// 일기 데이터 조회 쿼리문 작성
async function selectDiaryInfoForPaging(query, startDate, EndDate, apiName) {
  logger.debug(`space_id값 얻은 후 사진조회 쿼리문 작성`);
  logger.debug("query %o:" + query);
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    startDate: startDate,
    EndDate: EndDate,
    function: "selectDiaryInfo()",
  });

  return {
    text: `SELECT D.diary_id, D.diary_content, P.photo_url, DATE_FORMAT(D.select_date, '%Y-%m-%d') AS select_date, U.user_name, U.user_prof_img 
            FROM DIARY AS D
            LEFT JOIN DIARY_PHOTO AS P ON D.diary_id = P.diary_id
            LEFT JOIN USER AS U ON D.user_id = U.user_id
            WHERE D.space_id = (SELECT space_id FROM MEMORY_SPACE WHERE dog_id = ? )
            AND D.select_date >= ? AND D.select_date <= ?
            ORDER BY D.select_date DESC, D.diary_id ASC
            LIMIT 2 OFFSET 2
            `,
    params: [query.dog_id, startDate, EndDate],
  };
}

// 일기 데이터 조회 쿼리문 작성
async function selectDiaryInfo(query, startDate, EndDate, apiName) {
  logger.debug(`space_id값 얻은 후 사진조회 쿼리문 작성`);
  logger.debug("query %o:" + query);
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    startDate: startDate,
    EndDate: EndDate,
    function: "selectDiaryInfo()",
  });

  return {
    text: `SELECT		  
                D.diary_id,
                D.diary_content,
                P.photo_url,
                DATE_FORMAT(D.select_date, '%Y-%m-%d') AS select_date,
                D.create_at,
                U.user_name,
                U.user_prof_img
            FROM
                DIARY AS D
                LEFT JOIN DIARY_PHOTO AS P ON D.diary_id = P.diary_id
                LEFT JOIN USER AS U ON D.user_id = U.user_id
            WHERE
                D.space_id = (SELECT space_id FROM MEMORY_SPACE WHERE dog_id = ?)
                AND D.select_date >= ?
                AND D.select_date <= ?
            ORDER BY
                D.select_date DESC, D.create_at DESC
            ;
            `,
    params: [query.dog_id, startDate, EndDate],
  };

  // return {
  //   text: `SELECT		  
  //               D.diary_id,
  //               D.diary_content,
  //               P.photo_url,
  //               DATE_FORMAT(D.select_date, '%Y-%m-%d') AS select_date,
  //               D.create_at,
  //               U.user_name,
  //               U.user_prof_img
  //           FROM
  //               DIARY AS D
  //               LEFT JOIN DIARY_PHOTO AS P ON D.diary_id = P.diary_id
  //               LEFT JOIN USER AS U ON D.user_id = U.user_id
  //           WHERE
  //               D.space_id = (SELECT space_id FROM MEMORY_SPACE WHERE dog_id = ?)
  //               AND D.select_date >= ?
  //               AND D.select_date <= ?
  //               AND D.select_date ${up_down} (SELECT select_date FROM DIARY WHERE diary_id = ?)
  //           ORDER BY
  //               D.select_date DESC, D.create_at ASC
  //           LIMIT ?;
  //           `,
  //   params: [query.dog_id, startDate, EndDate, diary_id, limit],
  // };


  // return {
  //   text: `SELECT		  
  //           ROW_NUMBER() OVER (ORDER BY select_date, create_at) AS increase_idx,
  //                 D.diary_id,
  //                 D.diary_content,
  //                 P.photo_url,
  //                 D.select_date, D.create_at,
  //                 U.user_name,
  //                 U.user_prof_img
  //             FROM
  //                 DIARY AS D
  //                 LEFT JOIN DIARY_PHOTO AS P ON D.diary_id = P.diary_id
  //                 LEFT JOIN USER AS U ON D.user_id = U.user_id
  //             WHERE
  //                 D.space_id = (SELECT space_id FROM MEMORY_SPACE WHERE dog_id = 81)
  //                 AND D.select_date >= ? AND D.select_date <= ?
  //                 AND D.diary_id
  //             ORDER BY
  //                 D.select_date DESC, D.create_at DESC
  //             LIMIT ? OFFSET ?;
  //           `,
  //   params: [query.dog_id, startDate, EndDate, limit, offset],
  // };
}



// 타임라인 조회 쿼리문 작성 (추억공간 top 화면)
async function selectDogInfo(query, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    function: "selectDogInfo()",
  });

  return {
    text: `SELECT
                dog_prof_img,
                dog_name,
                dog_bkg_img
            FROM DOG 
            WHERE dog_id = ?;
       `,
    params: [query.dog_id],
  };
}

// 타임라인 유저이름 조회 쿼리문 작성
async function selectUserInfo(query, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    function: "selectUserInfo()",
  });

  return {
    text: `SELECT u.user_name, u.user_prof_img 
            FROM MEMORY_SPACE as m
            LEFT JOIN USER as u on m.user_id = u.user_id 
            WHERE m.dog_id = ?
       `,
    params: [query.dog_id],
  };
}

// 일기정보 수정 쿼리문 작성
async function changeDiary(query, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    function: "changeDiary()",
  });

  return {
    text: `UPDATE DIARY 
                SET select_date = ?,
                emotion = ?,
                diary_content = ?
                WHERE diary_id = ? `,
    params: [
      query.select_date,
      query.emotion,
      query.diary_content,
      query.diary_id,
    ],
  }; // 파라미터 4개
}

// 일기 사진 url 삭제 쿼리문 작성
async function removeDiaryPhotoUrls(diary_id, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    diary_id: diary_id,
    function: "removeDiaryPhotoUrls()",
  });

  return {
    text: `DELETE FROM DIARY_PHOTO
                WHERE diary_id = ? `,
    params: [diary_id],
  };
}

// 일기 삭제 쿼리문 작성
async function removeDiary(diary_id, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    diary_id: diary_id,
    function: "removeDiary()",
  });

  return {
    text: `DELETE FROM DIARY
                WHERE diary_id = ? `,
    params: [diary_id],
  };
}

// 일기사진 조회 쿼리문 작성 2
async function selectPhotoForS3(diary_id, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    diary_id: diary_id,
    function: "selectPhotoForS3()",
  });

  return {
    text: `SELECT bucket, s3key
                FROM DIARY_PHOTO
                WHERE diary_id = ? `,
    params: [diary_id],
  };
}

// 일기사진 조회 쿼리문 작성 1
async function selectPhotoByOneDiary(diary_id, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    diary_id: diary_id,
    function: "selectPhotoByOneDiary()",
  });

  return {
    text: `SELECT photo_id, photo_url
                FROM DIARY_PHOTO
                WHERE diary_id = ? `,
    params: [diary_id],
  };
}

// 일기 조회 쿼리문 작성
async function selectDiary(query, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    function: "selectDiary()",
  });

  return {
    text: `SELECT diary_id, emotion, diary_content, DATE_FORMAT(select_date, '%Y-%m-%d') AS select_date
                FROM DIARY
                WHERE diary_id = ? `,
    params: [query.diary_id],
  };
}

// DIARY_PHOTO 테이블에 사진URL 저장
async function addDiaryPhoto(diary_id, photo_url, bucket, key, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    diary_id: diary_id,
    photo_url: photo_url,
    bucket: bucket,
    key: key,
    function: "addDiaryPhoto()",
  });

  return {
    // 컬럼 6개
    text: `INSERT INTO DIARY_PHOTO 
                (diary_id, photo_url, bucket, s3key, create_at, update_at) 
                VALUES (?, ?, ?, ?, now(), null)`,
    params: [diary_id, photo_url, bucket, key],
  };
}

// DIARY 테이블에 일기 정보 생성
async function addDiary(query, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    function: "addDiary()",
  });

  return {
    // 파라미터 7개
    text: `INSERT INTO DIARY 
                (space_id, user_id, select_date, emotion, diary_content, create_at, update_at) 
                VALUES (?, ?, ?, ?, ?, now(), null)`,
    params: [
      query.space_id,
      query.user_id,
      query.select_date,
      query.emotion,
      query.diary_content,
    ],
  };
}

// DOG 삭제 쿼리문 작성
async function removeDog(dog_id, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    dog_id: dog_id,
    function: "removeDog()",
  });

  return {
    text: `DELETE FROM DOG
                WHERE dog_id = ? `,
    params: [dog_id],
  };
}

// 추억공간 삭제 쿼리문 작성
async function removeSpace(space_id, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    space_id: space_id,
    function: "removeSpace()",
  });

  return {
    text: `DELETE FROM MEMORY_SPACE
                WHERE space_id = ? `,
    params: [space_id],
  };
}

// 추억공간 조회 쿼리문 작성
async function selectSpace(space_id, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    space_id: space_id,
    function: "selectSpace()",
  });

  return {
    text: `SELECT *
                FROM MEMORY_SPACE
                WHERE space_id = ? `,
    params: [space_id],
  };
}

// 반려견 정보 조회 쿼리문 작성
async function selectDog(dog_id, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    dog_id: dog_id,
    function: "selectDog()",
  });

  return {
    text: `SELECT dog_name, dog_breed, dog_sex, dog_prof_img, dog_bkg_img, DATE_FORMAT(dog_birth, '%Y-%m-%d') AS dog_birth
                FROM DOG
                WHERE dog_id = ? `,
    params: [dog_id],
  }; // 파라미터 6개
}

// 추억공간 배경사진 수정 쿼리문 작성
async function changeBackgroundImg(query, file_location, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    file_location: file_location,
    function: "changeBackgroundImg()",
  });

  return {
    text: `UPDATE DOG 
                SET dog_bkg_img = ?,
                    update_at = now()
                WHERE dog_id = ? `,
    params: [file_location, query.dog_id],
  };
}

// 추억공간 반려견 정보 수정 쿼리문 작성
async function changeDog(query, file_location, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    file_location: file_location,
    function: "changeDog()",
  });

  // 사진수정한다면 S3 url 변경하기
  if (file_location != null) {
    return {
      text: `UPDATE DOG 
                    SET dog_name = ?,
                    dog_breed = ?,
                    dog_sex = ?,
                    dog_prof_img = ?,
                    dog_birth = ?,
                    update_at = now()
                    WHERE dog_id = ? `,
      params: [
        query.dog_name,
        query.dog_breed,
        query.dog_sex,
        file_location,
        query.dog_birth,
        query.dog_id,
      ],
    }; // 파라미터 6개
  } else {
    // 사진수정 안 한다면 S3 url 냅두기
    return {
      text: `UPDATE DOG 
                    SET dog_name = ?,
                    dog_breed = ?,
                    dog_sex = ?,
                    dog_birth = ?,
                    update_at = now()
                    WHERE dog_id = ? `,
      params: [
        query.dog_name,
        query.dog_breed,
        query.dog_sex,
        query.dog_birth,
        query.dog_id,
      ],
    }; // 파라미터 6개
  }
}

// 추억공간 생성 쿼리문 작성
async function addSpace(user_id, dog_id, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    user_id: user_id,
    dog_id: dog_id,
    function: "addSpace()",
  });

  return {
    text: `INSERT INTO MEMORY_SPACE 
                (user_id, dog_id, create_at) 
                VALUES (?, ?, now())`,
    params: [user_id, dog_id],
  };
}

// DOG테이블에 반려견 정보 생성
async function addDog(user_id, query, file_location, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    user_id: user_id,
    file_location: file_location,
    function: "addDog()",
  });

  return {
    // 파라미터 7개
    text: `INSERT INTO DOG 
                (user_id, dog_name, dog_breed, dog_sex, dog_prof_img, dog_birth, create_at) 
                VALUES (?, ?, ?, ?, ?, ?, now())`,
    params: [
      user_id,
      query.dog_name,
      query.dog_breed,
      query.dog_sex,
      file_location,
      query.dog_birth,
    ],
  };
}

// 이메일로 user_id 찾기
async function getUserId(email, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    email: email,
    function: "getUserId()",
  });

  return {
    text: `SELECT user_id 
                FROM USER
                WHERE user_email = ?;`,
    params: [email],
  };
}

// 재사용할 쿼리 함수
function mySQLQuery(query, apiName) {
  return new Promise(function (resolve, reject) {
    try {
      connection.query(query.text, query.params, function (err, rows, fields) {
        if (err) {
          logger.error({
            API: apiName,
            "mySQLQuery() 에러": err,
          });
          return resolve(9999); // reject하지말고 9999응답하기
        } else {
          return resolve(rows);
        }
      });
    } catch (err) {
      logger.error({
        API: apiName,
        "catch mySQLQuery() 에러": err,
      });
      return resolve(9999); // reject하지말고 9999응답하기
    }
  });
}

module.exports = new spaceMng(); // spaceMng 모듈 export
