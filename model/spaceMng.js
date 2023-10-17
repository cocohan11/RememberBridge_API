/** 추억공간 비지니스 로직 */

const dbPool = require('../util/dbPool');
const connection = dbPool.init();
require("dotenv").config(); // 환경변수 모듈
const {
    // 환경변수'
} = process.env;
function spaceMng() {}


/** 일기 등록
 * 1. space id 존재유무 조회
 * 2. DB) 파라미터들 DIARY 테이블에 저장
 * 3. DB) 사진들 DIARY_PHOTO 테이블에 하나씩 저장
 * 4. 로직2, 로직3 성공해야 diary_id 응답하기
*/
spaceMng.prototype.addDiary = async (query, locations) => {
    
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
    for (const location of locations) { // 반복문을 사용하여 locations 배열 내의 URL을 하나씩 처리
        let photo_id = await mySQLQuery(await addDiaryPhoto(diary_id, location));
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


//------------------------- 쿼리 -------------------------

// DIARY_PHOTO 테이블에 사진URL 저장
async function addDiaryPhoto(diary_id, photo_url) {
    console.log(`DIARY_PHOTO 테이블에 사진URL 저장 쿼리문 작성`)
    console.log('diary_id %o:', diary_id);
    console.log('photo_url %o:', photo_url);
    
    return { // 컬럼 4개
        text: `INSERT INTO DIARY_PHOTO 
                (diary_id, photo_url, create_at, update_at) 
                VALUES (?, ?, now(), null)`, 
        params: [diary_id, photo_url] 
    };
}

// DIARY 테이블에 일기 정보 생성
async function addDiary(query) {
    console.log(`일기 정보 생성 쿼리문 작성`)
    console.log('query %o:', query);
    
    return { // 파라미터 6개
        text: `INSERT INTO DIARY 
                (space_id, select_date, emotion, dairy_content, create_at, update_at) 
                VALUES (?, ?, ?, ?, now(), null)`, 
        params: [query.space_id, query.select_date, query.emotion, query.dairy_content] 
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