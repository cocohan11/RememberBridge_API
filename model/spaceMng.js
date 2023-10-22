/** 추억공간 비지니스 로직 */

const dbPool = require('../util/dbPool');
const connection = dbPool.init();
require("dotenv").config(); // 환경변수 모듈
const {
    AWS_S3_ACCESS_ID, AWS_S3_ACCESS_KEY, AWS_S3_REGION// 환경변수'
} = process.env;
const AWS = require('aws-sdk');
AWS.config.update({
    region: AWS_S3_REGION,
    accessKeyId: AWS_S3_ACCESS_ID,
    secretAccessKey: AWS_S3_ACCESS_KEY
});
const s3 = new AWS.S3();
function spaceMng() { }



/** 일기 좋아요 등록/해제 
* 1. Like테이블 값 리턴 (like)
* 2. Diary테이블 값 리턴 (emotion, diary_content)
* 3. User테이블 값 리턴 (writer(user_name))
* 4. Comment테이블 값 리턴 (comment_id, user_name, context, count)
*/
spaceMng.prototype.getDiaryDetail = async (diaryId, userId) => { // body(반려견 정보)
    
    
    // 1. like
    let like = await mySQLQuery(await selectDiaryLike(diaryId, userId))
    console.log('like %o:', like);
    if (like.length == 0) like = false;

    // 2. emotion, diary_content
    let emotionAndContent = await mySQLQuery(await selectDiaryEmotionAndContent(diaryId))
    console.log('emotionAndContent %o:', emotionAndContent);
    if (emotionAndContent.length == 0) return 1005;

    // 3. writer
    let writer = await mySQLQuery(await selectDiaryWriter(userId))
    console.log('writer %o:', writer); 
    if (writer.length == 0) return 1005;

    // diary_info 안에 3개값 담기
    diary_info = {
        like:like,
        emotion:emotionAndContent[0].emotion,
        diary_content:emotionAndContent[0].diary_content,
        writer:writer[0].writer
    }

    // 4. comment_id, user_name, context, count


}


/** 일기 좋아요 등록/해제 
* 1. DB에서 좋아요 조회 (select문)
* 2. 조회 안 되면 DB에 추가 (insert문)
* 3. 조회 되면 DB에서 삭제 (delete문)
*/
spaceMng.prototype.setLike = async (diaryId, userId) => { // body(반려견 정보)
    
    
    // 1. DB에서 좋아요 조회
    let res = await mySQLQuery(await selectDiaryLike(diaryId, userId))
    console.log('res %o:', res);


    // 2. 조회된 값이 1개면 delete문
    if (res.length == 1) {  
        let res = await mySQLQuery(await removeDiaryLike(diaryId, userId))
        console.log('res %o:', res);
        return false; // 좋아요(X) 리턴


    // 3. 조회된 값이 0개면 insert문
    } else {  
        let res = await mySQLQuery(await addDiaryLike(diaryId, userId))
        console.log('res %o:', res);
        return true; // 좋아요(O) 리턴
    }
}


/** 추억공간 배경사진 수정 
   - DOG 테이블에 반려견 배경사진 수정
*/
spaceMng.prototype.changeBackgroundImg = async (query, file_location) => { // body(반려견 정보)
    console.log('query %o:', query);
    console.log('file_location %o:', file_location);
    
    // DOG 테이블에 배경사진 수정
    let res = await mySQLQuery(await changeBackgroundImg(query, file_location))
    console.log('res %o:', res);

    if (res.changedRows == 1) {  // 변경된값이 1개면 성공
        return 2000
    } else {  // 변경된값이 없음
        return 1005
    }
    
}


/** 타임라인 조회
 * 1. DB) DOG 테이블 조회
 * 2. DB) USER 테이블 조회
 * 3. DB) DIARY, DIARY_PHOTO 테이블 조회
 * 4. 응답값 그룹화 (날짜-일기-일기데이터 순)
*/
spaceMng.prototype.getTimeline = async (query) => {
    
    
    // 1. DB) DOG 테이블에서 dog_info 리턴
    let dog_info = await mySQLQuery(await selectDogInfo(query))
    console.log('dog_info %o:', dog_info);
    if (!dog_info) return 1005; // 조회된 데이터가 없으면 1005 응답


    // 2. DB) USER 테이블에서 user_info 리턴
    let user_info = await mySQLQuery(await selectUserInfo(query))
    console.log('user_info %o:', user_info);
    if (!user_info) return 1005; // 조회된 데이터가 없으면 1005 응답


    // 3. DB) 일기 데이터 얻기
    let dairy_info = await mySQLQuery(await selectDiaryInfo(query))
    console.log('dairy_info %o:', dairy_info);


    // 일기를 "diary_id"를 기준으로 그룹화할 객체
    const groupedDiaries = {};
    console.log('groupedDiaries 비어있음 %o:', groupedDiaries);
    dairy_info.forEach((result) => {
        const { diary_id, diary_content, photo_url, select_date } = result;
        if (!groupedDiaries[select_date]) {  // select_date 키로 된 객체가 없다면
            groupedDiaries[select_date] = {};  // 새로운 빈 객체를 만들어 해당 키(select_date)로 추가한다.
        }
        if (!groupedDiaries[select_date][diary_id]) {
            groupedDiaries[select_date][diary_id] = [];
        }
        groupedDiaries[select_date][diary_id].push({ diary_content, photo_url });
    });
    console.log(JSON.stringify(groupedDiaries, null, 2)); // JSON 형태로 출력


    return {
        dog_info: dog_info,
        user_info: user_info,
        dairy_info: groupedDiaries,
    }; // 원하는 출력 모양을 추가함
}


/** 일기 수정 
 * 0. 미들웨어로 S3에 새로받은 사진 저장하기 
 * 1. 사진 수정이 없다면 - DB의 DIARY 테이블만 수정하고 응답
 * 2. 사진 수정이 있다면 - DB의 DIARY 테이블 수정
 * 3. (존재확인 선행) 해당 일기의 DIARY_PHOTO 테이블 삭제 
 * 4. (존재확인 선행) 해당 일기의 S3 사진 전체삭제 
 * 5. DB DIARY_PHOTO 테이블에 추가하기
*/
spaceMng.prototype.changeDiary = async (query, files, fileInfo) => { // body(일기 정보)
    
    // 일기정보 수정 (공통)
    let res = await mySQLQuery(await changeDiary(query))
    console.log('res %o:', res);
    
    // 1. 사진 수정이 없다면 - 최종응답하기
    if (!files) {
        if (res.changedRows == 1) return 2000  // 1개 레코드 수정됐으면 성공
        else return 1005
    } 

    // ------------------------- 수정 있다면 -------------------------
    // 2-1. 존재유무 확인 - db)url
    let diary_photos = await mySQLQuery(await selectPhotoForS3(query.diary_id))
    console.log('diary_photos %o:', diary_photos);
    console.log('diary_photos.length %o:', diary_photos.length);
    if (diary_photos.length == 0) return 1005; // 조회된 데이터가 없으면 1005 응답
    
    // 2-2) 존재유무 확인 - S3사진파일
    let bucketPathList = []; 
    let bucketPathList_exist = [];
    for (let i = 0; i < diary_photos.length; i++) { // for문을 사용하여 locations 배열 내의 URL을 하나씩 처리
        bucketPathList.push({ Bucket: diary_photos[i].bucket, Key: diary_photos[i].s3key })
        console.log('i :', i);
        console.log('bucketPathList :', bucketPathList);
    }

    // S3에 사진존재하는지 확인하기
    const result = await checkfileExists(bucketPathList, bucketPathList_exist);
    console.log('result :', result);
    if (result == 1005) return 1005;

    // 3-1) 삭제하기 - 사진URL
    let res_delete_url = await mySQLQuery(await removeDiaryPhotoUrls(query.diary_id))
    console.log('res_delete_url %o:', res_delete_url); 
    if (res_delete_url.affectedRows == 0) return 9999; // 삭제실패시 9999 응답

    // 3-2) 삭제하기 - S3사진파일
    const res_delete_s3 = await removeDiaryPhotosFromS3(bucketPathList);
    console.log('res_delete_s3 %o:', res_delete_s3); 
    // return res_delete_s3; // 2000 또는 9999

    // ------------------ 5. DB에 url 저장하기 (여기위치하기 - 삭제후 저장) -------------------
    for (let i = 0; i < fileInfo.locations.length; i++) { // for문을 사용하여 locations 배열 내의 URL을 하나씩 처리
        const location = fileInfo.locations[i];
        const bucket = fileInfo.bucket[i];
        const key = fileInfo.key[i];
        
        let photo_id = await mySQLQuery(await addDiaryPhoto(query.diary_id, location, bucket, key));
        console.log('DB에 url 저장하기 fileInfo.locations.length %o:', fileInfo.locations.length);
        console.log('DB에 url 저장하기 photo_id %o:', photo_id);
        if (!photo_id) return 9999; // 저장안됐으면 9999응답
    }
    return 2000;
    
}


/** 일기 삭제
 * 1. 일기데이터, 사진URL, S3사진파일 존재유무 확인
 * 2. 전부 존재한다면 하나씩 삭제하기 (안정성)
*/
spaceMng.prototype.removeDiary = async (query) => {

    // 1-1) 존재유무 확인 - 일기데이터
    let diary_info = await mySQLQuery(await selectDiary(query))
    console.log('diary_info %o:', diary_info);
    if (!diary_info) return 1005; // 조회된 데이터가 없으면 1005 응답

    // 1-2) 존재유무 확인 - 사진URL
    let diary_photos = await mySQLQuery(await selectPhotoForS3(query.diary_id))
    console.log('diary_photos %o:', diary_photos);
    console.log('diary_photos.length %o:', diary_photos.length);
    if (diary_photos.length == 0) return 1005; // 조회된 데이터가 없으면 1005 응답

    // 1-3) 존재유무 확인 - S3사진파일
    let bucketPathList = []; 
    let bucketPathList_exist = [];
    for (let i = 0; i < diary_photos.length; i++) { // for문을 사용하여 locations 배열 내의 URL을 하나씩 처리
        bucketPathList.push({ Bucket: diary_photos[i].bucket, Key: diary_photos[i].s3key })
        console.log('i :', i);
        console.log('bucketPathList :', bucketPathList);
    }

    // S3에 사진존재하는지 확인하기
    const result = await checkfileExists(bucketPathList, bucketPathList_exist);
    console.log('result :', result);
    if (result == 1005) return 1005;

    //---------------------------------------------------------
    // 2-1) 삭제하기 - 일기데이터
    let res_delete = await mySQLQuery(await removeDiary(query.diary_id))
    console.log('res_delete %o:', res_delete);
    if (res_delete.affectedRows != 1) return 9999; // 삭제실패시 9999 응답

    // 2-2) 삭제하기 - 사진URL
    let res_delete_url = await mySQLQuery(await removeDiaryPhotoUrls(query.diary_id))
    console.log('res_delete_url %o:', res_delete_url); 
    if (res_delete_url.affectedRows == 0) return 9999; // 삭제실패시 9999 응답

    // 2-3) 삭제하기 - S3사진파일
    const res_delete_s3 = await removeDiaryPhotosFromS3(bucketPathList);
    console.log('res_delete_s3 %o:', res_delete_s3); 
    return res_delete_s3; // 2000 또는 9999

}


/** 일기 조회
 * 1. DB) DIARY 테이블에서 diary_info 리턴
 * 2. DB) DIARY_PHOTO 테이블에서 URL배열 리턴
*/
spaceMng.prototype.getDiary = async (query) => {
    
    // 1. DB) DIARY 테이블에서 diary_info 리턴
    let diary_info = await mySQLQuery(await selectDiary(query))
    console.log('diary_info %o:', diary_info);
    if (!diary_info) return 1005; // 조회된 데이터가 없으면 1005 응답


    // 2. DB) DIARY_PHOTO 테이블에서 URL배열 리턴
    let diary_photos = await mySQLQuery(await selectPhotoByOneDiary(query.diary_id))
    console.log('diary_photos %o:', diary_photos);
    if (diary_photos.length == 0) return 1005; // 조회된 데이터가 없으면 1005 응답

    // API성공 시) 원하는 출력 모양을 추가함
    return {
        diary_info: diary_info[0],
        diary_photos: diary_photos,
    }; 

}


/** 일기 등록
 * 1. space id 존재유무 조회
 * 2. DB) 파라미터들 DIARY 테이블에 저장
 * 3. DB) 사진들 DIARY_PHOTO 테이블에 하나씩 저장
 * 4. 로직2, 로직3 성공해야 diary_id 응답하기
*/
spaceMng.prototype.addDiary = async (query, fileInfo) => {
    
    // 1. 추억공간 조회
    const find_space = await mySQLQuery(await selectSpace(query.space_id))
    console.log('find_space.length 1이어야함 %o:', find_space.length);
    if (find_space.length != 1) return 1005; // 추억공간이 조회안된다면 다음 로직안넘어가고 1005 응답으로 끝냄


    // 2. DB) 파라미터들 DIARY 테이블에 저장
    let diary_id = await mySQLQuery(await addDiary(query))
    diary_id = diary_id.insertId; // diary_id만 추출
    console.log('diary_id %o:', diary_id);
    if (!diary_id) return 9999; // 저장안됐으면 9999응답


    // 3. DB) 사진들 DIARY_PHOTO 테이블에 하나씩 저장
    for (let i = 0; i < fileInfo.locations.length; i++) { // for문을 사용하여 locations 배열 내의 URL을 하나씩 처리
        const location = fileInfo.locations[i];
        const bucket = fileInfo.bucket[i];
        const key = fileInfo.key[i];
        
        let photo_id = await mySQLQuery(await addDiaryPhoto(diary_id, location, bucket, key));
        console.log('photo_id %o:', photo_id);
        if (!photo_id) return 9999; // 저장안됐으면 9999응답
    }


    // 4. diary_id 응답하기
    return diary_id;
}


/** 추억공간 & 반려견 정보 삭제 (추후 사진삭제예정)
 * 1. 추억공간 조회
 * 2. DOG 조회
 * 3. 추억공간 삭제
 * 4. DOG 삭제
*/
spaceMng.prototype.removeSpace = async (query) => { 
    
    // 1. 추억공간 조회
    const find_space = await mySQLQuery(await selectSpace(query.space_id))
    console.log('find_space.length 1이어야함 %o:', find_space.length);
    console.log('find_space.dog_id %o:', find_space[0].dog_id);
    const dog_id = find_space[0].dog_id;

    // 2. DOG 조회
    let find_dog = await mySQLQuery(await selectDog(dog_id))
    console.log('find_dog.length 1이어야함 %o:', find_dog.length);
       
    // 둘 다 조회되어야 삭제하기
    if (find_space.length == 1 && find_dog.length == 1) {
        

        // 3. 추억공간 삭제
        let res_space = await mySQLQuery(await removeSpace(query.space_id))
        console.log('res_space.affectedRows 1이어야함 %o:', res_space.affectedRows);
        
        // 4. DOG 삭제
        let res_dog = await mySQLQuery(await removeDog(dog_id))
        console.log('res_dog.affectedRows 1이어야함 %o:', res_dog.affectedRows);

        // 둘 다 삭제되어야 2000응답
        if (res_space.affectedRows == 1 && res_dog.affectedRows == 1) {
            return 2000
        } else {
            return 9999
        }
    } else {
        return 1005
    }
    
}


/** 추억공간 반려견 정보 조회
   - DOG 테이블 반려견 정보 조회
*/
spaceMng.prototype.getDogInfo = async (dog_id) => { 
    
    // DOG 테이블 반려견 정보 조회
    let res = await mySQLQuery(await selectDog(dog_id))
    console.log('res %o:', res);
    console.log('res.length %o:', res.length);

    if (res.length == 1) { // 조회된 강아지가 1마리인 경우
        return res
    } else { // 1마리가 아닌 경우
        return 1005
    }

}


/** 추억공간 수정 
   - DOG 테이블에 반려견 정보 수정
*/
spaceMng.prototype.changeDog = async (query, file_location) => { // body(반려견 정보)
    
    // DOG 테이블에 반려견 정보 수정
    let res = await mySQLQuery(await changeDog(query, file_location))
    console.log('res %o:', res);

    if (res.changedRows > 0) {  // 변경된값이 1개 이상임
        return 2000
    } else {  // 변경된값이 없음
        return 1005
    }
    
}


/** 추억공간 생성 
 * 1. 이메일로 user_id 응답받기
 * 2. DOG 테이블에 반려견 정보 저장
 * 3. MEMORY_SPACE 테이블에 user_id, dog_id값 저장
*/
spaceMng.prototype.addSpace = async (query, file_location) => {
    
    // 1. 이메일로 user_id 응답받기
    let user_id = await mySQLQuery(await getUserId(query.user_email)) // email -> user_id
    if (!user_id[0]) return 1005; // 없는 이메일 예외처리
    user_id = user_id[0].user_id; // user_id만 추출
    console.log('user_id %o:', user_id);

    // 2. DOG 테이블에 반려견 정보 저장
    let dog_id = await mySQLQuery(await addDog(user_id, query, file_location))
    dog_id = dog_id.insertId; // dog_id만 추출
    console.log('dog_id %o:', dog_id);

    // 3. MEMORY_SPACE 테이블에 user_id, dog_id값 저장
    let space_id = await mySQLQuery(await addSpace(user_id, dog_id)) // + bkg_img_url 파라미터 추가하기
    space_id = space_id.insertId; // space_id만 추출
    
    // API성공 시) 원하는 출력 모양을 추가함
    return {
        space_id: space_id,
        dog_id: dog_id,
    }; 
}


//------------------------- 함수 -------------------------

// S3 파일삭제 요청양식
function pramsForDeleteObjects(bucketPathList_exist, idx) { 
    return params = {
      Bucket: bucketPathList_exist[idx].Bucket, 
      Delete: {
       Objects: [
        {
          Key: bucketPathList_exist[idx].Key 
        }
       ], 
       Quiet: false // (참고) Delete API 요청에 대한 응답에 삭제 작업의 성공/실패 여부와 관련된 정보
      }
    };
}

// S3 파일삭제 함수
async function removeDiaryPhotosFromS3(bucketPathList) {
    console.log(`deleteFiles() 삭제할 파일 갯수: ${bucketPathList.length}`);
  
    try {
      const deletePromises = bucketPathList.map((value, index) => {
        return s3.deleteObjects(pramsForDeleteObjects(bucketPathList, index)).promise();
      });
  
      await Promise.all(deletePromises); // 모든 삭제 작업을 병렬로 처리
      console.log(`File deleted successfully.`); // 조회O 삭제O
      return 2000;
    } catch (err) {
      console.log(`deleteFiles() err: \n${JSON.stringify(err.stack, null, 2)}`);
      return 9999; 
    }
}

// S3 파일존재유무 조회
async function checkfileExists(bucketPathList, bucketPathList_exist) {
    console.log('파일명으로 S3에 사진있는지 조회하기 checkExists()');
    console.log('bucketPathList', bucketPathList);
    const promises = [];
  
    for (const value of bucketPathList) {
      if (value != null) {
        promises.push(
          new Promise(async (resolve, reject) => {
            try {
              const exists_data = await s3.headObject(value).promise();
              console.log(`File ${value.Key} exists. checking...and list push`);
              bucketPathList_exist.push(value);
              console.log('bucketPathList_exist', bucketPathList_exist);
              resolve(exists_data);
            } catch (err) {
              console.log(`File ${value.Key} does not exist.`);
              reject(1005);
            }
          })
        );
      }
    }
  
    try {
      console.log(`promises 안에 담겨져서 존재하는지 조회할 파일 갯수: ${promises.length}`);
      const res = await Promise.all(promises);
      console.log('res', res);
      console.log('All files exist. Deleting...');
      return 2000;
    } catch (err) {
      console.log('File does not exist. Cannot delete.');
      return 1005;
    }
}
//------------------------- 쿼리 -------------------------


// 일기 작성자 조회 쿼리문 작성 
async function selectDiaryComment(diaryId, userId) {
    console.log(`일기 작성자 조회 쿼리문 작성`)

    return { 
        text: `SELECT comment_id, user_name, context, count 
                FROM COMMENT 
                WHERE diary_id = ? and user_id = ? ;
        `, 
        params: [diaryId, userId] 
    }; 
}

// 일기 작성자 조회 쿼리문 작성 
async function selectDiaryWriter(userId) {
    console.log(`일기 작성자 조회 쿼리문 작성`)

    return { 
        text: `SELECT user_name as writer 
                FROM USER 
                WHERE user_id = ?;
        `, 
        params: [userId] 
    }; 
}

// 일기 감정,내용 조회 쿼리문 작성 
async function selectDiaryEmotionAndContent(diaryId) {
    console.log(`일기 감정,내용 조회 쿼리문 작성`)

    return { 
        text: `SELECT emotion, diary_content 
                FROM DIARY 
                WHERE diary_id = ?;
        `, 
        params: [diaryId] 
    }; 
}

// 일기 좋아요 해제 쿼리문 작성 
async function removeDiaryLike(diaryId, userId) {
    console.log(`일기 좋아요 해제 쿼리문 작성`)

    return { 
        text: `DELETE FROM rb2web.LIKE
                WHERE diary_id = ? and user_id = ?`, 
        params: [diaryId, userId] 
    }; 
}

// 일기 좋아요 등록 쿼리문 작성 
async function addDiaryLike(diaryId, userId) {
    console.log(`일기 좋아요 등록 쿼리문 작성`)

    return { // 컬럼 6개
        text: `INSERT INTO rb2web.LIKE 
                (diary_id, user_id, create_at) 
                VALUES (?, ?, now() )`, 
        params: [diaryId, userId] 
    };
}

// 일기 좋아요 조회 쿼리문 작성 
async function selectDiaryLike(diaryId, userId) {
    console.log(`일기 좋아요 조회 쿼리문 작성`)

    return { 
        text: `SELECT * 
                FROM rb2web.LIKE 
                WHERE diary_id = ? and user_id = ?;
        `, 
        params: [diaryId, userId] 
    }; 
}

// 일기 데이터 조회 쿼리문 작성 
async function selectDiaryInfo(query) {
    console.log(`space_id값 얻은 후 사진조회 쿼리문 작성`)
    console.log('query %o:', query);
    
    return { 
        text: `SELECT D.diary_id, D.diary_content, P.photo_url, DATE_FORMAT(D.select_date, '%Y-%m-%d') AS select_date 
                FROM DIARY AS D
                LEFT JOIN DIARY_PHOTO AS P ON D.diary_id = P.diary_id
                WHERE D.space_id = (SELECT space_id FROM MEMORY_SPACE WHERE dog_id = ? );`, 
        params: [query.dog_id] 
    }; 
}

// 타임라인 조회 쿼리문 작성 (추억공간 top 화면)
async function selectDogInfo(query) {
    console.log(`타임라인 조회 쿼리문 작성`)
    console.log('query %o:', query);

    return { 
        text: `SELECT
                dog_prof_img,
                dog_name,
                dog_bkg_img
            FROM DOG 
            WHERE dog_id = ?;
       `, 
        params: [query.dog_id] 
    }; 
}

// 타임라인 유저이름 조회 쿼리문 작성 
async function selectUserInfo(query) {
    console.log(`타임라인 유저이름 조회 쿼리문 작성`)
    console.log('query %o:', query);

    return { 
        text: `SELECT
                user_name
            FROM USER 
            WHERE user_id = ?;
       `, 
        params: [query.user_id] 
    }; 
}



// 일기정보 수정 쿼리문 작성
async function changeDiary(query) {
    console.log(`일기정보 수정 쿼리문 작성`)
    console.log('query %o:', query);

    return { 
        text: `UPDATE DIARY 
                SET select_date = ?,
                emotion = ?,
                diary_content = ?
                WHERE diary_id = ? `, 
        params: [query.select_date, query.emotion, query.diary_content, query.diary_id] 
    }; // 파라미터 4개
}

// 일기 사진 url 삭제 쿼리문 작성
async function removeDiaryPhotoUrls(diary_id) {
    console.log(`일기 사진 url 삭제 쿼리문 작성`)
    console.log('diary_id %o:', diary_id);

    return { 
        text: `DELETE FROM DIARY_PHOTO
                WHERE diary_id = ? `, 
        params: [diary_id] 
    }; 
}

// 일기 삭제 쿼리문 작성
async function removeDiary(diary_id) {
    console.log(`일기 삭제 쿼리문 작성`)
    console.log('diary_id %o:', diary_id);

    return { 
        text: `DELETE FROM DIARY
                WHERE diary_id = ? `, 
        params: [diary_id] 
    }; 
}

// 일기사진 조회 쿼리문 작성 2
async function selectPhotoForS3(diary_id) {
    console.log(`반려견 정보 조회 쿼리문 작성`)
    console.log('diary_id %o:', diary_id);

    return { 
        text: `SELECT bucket, s3key
                FROM DIARY_PHOTO
                WHERE diary_id = ? `, 
        params: [diary_id] 
    }; 
}

// 일기사진 조회 쿼리문 작성 1
async function selectPhotoByOneDiary(diary_id) {
    console.log(`반려견 정보 조회 쿼리문 작성`)
    console.log('diary_id %o:', diary_id);

    return { 
        text: `SELECT photo_id, photo_url
                FROM DIARY_PHOTO
                WHERE diary_id = ? `, 
        params: [diary_id] 
    }; 
}

// 일기 조회 쿼리문 작성
async function selectDiary(query) {
    console.log(`반려견 정보 조회 쿼리문 작성`)
    console.log('query %o:', query);

    return { 
        text: `SELECT diary_id, emotion, diary_content, DATE_FORMAT(select_date, '%Y-%m-%d') AS select_date
                FROM DIARY
                WHERE diary_id = ? `, 
        params: [query.diary_id] 
    }; 
}

// DIARY_PHOTO 테이블에 사진URL 저장
async function addDiaryPhoto(diary_id, photo_url, bucket, key) {
    console.log(`DIARY_PHOTO 테이블에 사진URL 저장 쿼리문 작성`)
    console.log('diary_id %o:', diary_id);
    console.log('photo_url %o:', photo_url);
    console.log('bucket %o:', bucket);
    console.log('key %o:', key);
    
    return { // 컬럼 6개
        text: `INSERT INTO DIARY_PHOTO 
                (diary_id, photo_url, bucket, s3key, create_at, update_at) 
                VALUES (?, ?, ?, ?, now(), null)`, 
        params: [diary_id, photo_url, bucket, key] 
    };
}

// DIARY 테이블에 일기 정보 생성
async function addDiary(query) {
    console.log(`일기 정보 생성 쿼리문 작성`)
    console.log('query %o:', query);
    
    return { // 파라미터 6개
        text: `INSERT INTO DIARY 
                (space_id, select_date, emotion, diary_content, create_at, update_at) 
                VALUES (?, ?, ?, ?, now(), null)`, 
        params: [query.space_id, query.select_date, query.emotion, query.diary_content] 
    };
}

// DOG 삭제 쿼리문 작성
async function removeDog(dog_id) {
    console.log(`DOG 삭제 쿼리문 작성`)
    console.log('dog_id %o:', dog_id);

    return { 
        text: `DELETE FROM DOG
                WHERE dog_id = ? `, 
        params: [dog_id] 
    }; 
}

// 추억공간 삭제 쿼리문 작성
async function removeSpace(space_id) {
    console.log(`추억공간 삭제 쿼리문 작성`)
    console.log('space_id %o:', space_id);

    return { 
        text: `DELETE FROM MEMORY_SPACE
                WHERE space_id = ? `, 
        params: [space_id] 
    }; 
}

// 추억공간 조회 쿼리문 작성
async function selectSpace(space_id) {
    console.log(`반려견 정보 조회 쿼리문 작성`)
    console.log('space_id %o:', space_id);

    return { 
        text: `SELECT *
                FROM MEMORY_SPACE
                WHERE space_id = ? `, 
        params: [space_id] 
    }; 
}

// 반려견 정보 조회 쿼리문 작성
async function selectDog(dog_id) {
    console.log(`반려견 정보 조회 쿼리문 작성`)
    console.log('dog_id %o:', dog_id);

    return { 
        text: `SELECT dog_name, dog_breed, dog_sex, dog_prof_img, DATE_FORMAT(dog_birth, '%Y-%m-%d') AS dog_birth
                FROM DOG
                WHERE dog_id = ? `, 
        params: [dog_id] 
    }; // 파라미터 6개
}

// 추억공간 배경사진 수정 쿼리문 작성
async function changeBackgroundImg(query, file_location) {
    console.log(`추억공간 배경사진 수정 쿼리문 작성`)
    console.log('query %o:', query);
    console.log('file_location %o:', file_location);

    return { 
        text: `UPDATE DOG 
                SET dog_bkg_img = ?,
                    update_at = now()
                WHERE dog_id = ? `, 
        params: [file_location, query.dog_id] 
    }; 
}

// 추억공간 반려견 정보 수정 쿼리문 작성
async function changeDog(query, file_location) {
    console.log(`추억공간 생성 쿼리문 작성`)
    console.log('query %o:', query);
    console.log('file_location %o:', file_location);

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
            params: [query.dog_name, query.dog_breed, query.dog_sex, file_location, query.dog_birth, query.dog_id] 
        }; // 파라미터 6개
    } else { // 사진수정 안 한다면 S3 url 냅두기
        return { 
            text: `UPDATE DOG 
                    SET dog_name = ?,
                    dog_breed = ?,
                    dog_sex = ?,
                    dog_birth = ?,
                    update_at = now()
                    WHERE dog_id = ? `, 
            params: [query.dog_name, query.dog_breed, query.dog_sex, query.dog_birth, query.dog_id] 
        }; // 파라미터 6개
    }
}

// 추억공간 생성 쿼리문 작성
async function addSpace(user_id, dog_id) {
    console.log(`추억공간 생성 쿼리문 작성`)
    console.log('user_id %o:', user_id);
    console.log('dog_id %o:', dog_id);

    return {
        text: `INSERT INTO MEMORY_SPACE 
                (user_id, dog_id, create_at) 
                VALUES (?, ?, now())`, 
        params: [user_id, dog_id] 
    };
}

// DOG테이블에 반려견 정보 생성
async function addDog(user_id, query, file_location) {
    console.log(`반려견 정보 생성 쿼리문 작성`)
    console.log('user_id %o:', user_id);
    console.log('query %o:', query);
    console.log('file_location %o:', file_location);

    return { // 파라미터 7개
        text: `INSERT INTO DOG 
                (user_id, dog_name, dog_breed, dog_sex, dog_prof_img, dog_birth, create_at) 
                VALUES (?, ?, ?, ?, ?, ?, now())`, 
        params: [user_id, query.dog_name, query.dog_breed, query.dog_sex, file_location, query.dog_birth] 
    };
}

// 이메일로 user_id 찾기
async function getUserId(email) {
    console.log(`회원가입 쿼리문 작성`)
    console.log('email %o:', email);

    return {
        text: `SELECT user_id 
                FROM USER
                WHERE user_email = ?;`, 
        params: [email] 
    };
}

// 재사용할 쿼리 함수 
function mySQLQuery(query) {
    return new Promise(function(resolve, reject) {
        try {
          connection.query(query.text, query.params, function(err, rows, fields) {
                if (err) {
                    console.log(`mySQLQuery() err: ${err} `)
                    return resolve(9999); // reject하지말고 9999응답하기
                } else {
                    return resolve(rows); 
                }
            });
        } catch (err) {
            console.log(`catch mySQLQuery() err: ${err} `)
            return resolve(9999); // reject하지말고 9999응답하기
        }
    })
};

module.exports = new spaceMng(); // spaceMng 모듈 export 