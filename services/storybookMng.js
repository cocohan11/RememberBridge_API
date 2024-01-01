/** 스토리북 비지니스 로직 */

const dbPool = require("../util/dbPool");
const S3function = require("../util/S3function");
const connection = dbPool.init();
connection.connect()
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




/** 책 1권 삭제
 * 1. 책 정보 삭제
 * 2. 스토리 삭제
 * 3. 프롬프트 삭제
 * 4. 이미지 url 삭제
 * 5. s3 이미지파일 삭제
 */
storybookMng.prototype.deleteBook = async (query, apiName) => {

  logger.debug({
    API: apiName,
    query: query,
  });

  try {
    connection.beginTransaction() // 트랜잭션 적용 시작
   

    // 1. 책정보 삭제
    const res1 = await mySQLQuery(deleteBook(query, apiName));
    logger.debug({
      API: apiName,
      res1: res1,
      affectedRows: res1.affectedRows,
    });
    if (res1.affectedRows != 1) return 1005;


    // 캐릭터삭제 추가해야함
    const res1_2 = await mySQLQuery(deleteChar(query, apiName));
    logger.debug({
      API: apiName,
      res1_2: res1_2,
      affectedRows: res1_2.affectedRows,
    });
    if (res1_2.affectedRows < 1) return 1005;


    // 2. 스토리 삭제
    const res2 = await mySQLQuery(deleteStory(query, apiName));
    logger.debug({
      API: apiName,
      res2: res2,
      affectedRows: res2.affectedRows,
    });
    if (res2.affectedRows < 1) return 1005;


    // 3. 프롬프트 삭제
    const res3 = await mySQLQuery(deletePrompt(query, apiName));
    logger.debug({
      API: apiName,
      res3: res3,
      affectedRows: res3.affectedRows,
    });
    if (res3.affectedRows < 1) return 1005;

    
    // 5. S3 이미지파일 삭제
    // 5-1. 버킷, 키 조회하기
    const res5 = await mySQLQuery(findImgUrlForS3(query, apiName));
    logger.debug({
      API: apiName,
      res5: res5,
    });


    // url이 있다면 사진파일 삭제
    if (res5.length != 0) {
      
      
      // 4. 이미지 url 삭제
      const res4 = await mySQLQuery(deleteImgUrl(query, apiName));
      logger.debug({
        API: apiName,
        res4: res4,
        affectedRows: res4.affectedRows,
      });
      if (res4.affectedRows < 1) return 1005;
      
      
      // 5-2. 버킷경로리스트 만들기
      let bucketPathList = [];
      let bucketPathList_exist = [];
      for (let i = 0; i < res5.length; i++) {
        // for문을 사용하여 locations 배열 내의 URL을 하나씩 처리
        bucketPathList.push({
          Bucket: res5[i].bucket,
          Key: res5[i].s3key,
        });
        logger.debug({
          i: i,
          bucketPathList: bucketPathList,
        });
      }
  
  
      // S3에 사진존재하는지 확인하기
      const result = await S3function.checkfileExists(s3, bucketPathList, bucketPathList_exist, apiName);
      logger.debug({
        API: apiName,
        result: result,
      });
      if (result == 1005) return 1005;
      
      
      // 5-3. s3삭제함수 불러오기
      const res_delete_s3 = await S3function.removeDiaryPhotosFromS3(s3, bucketPathList, apiName);
      logger.debug({
        API: apiName,
        res_delete_s3: res_delete_s3,
      });
      if (res_delete_s3 == 1005) return 1005;

    } 

    
    connection.commit() // 커밋
    return 2000


  } catch (err) {
    console.log("롤백 err : "+err)
    connection.rollback() // 롤백
    return 9999;
  } 

}; 


/** 작가이름 수정
 */
storybookMng.prototype.editWriter = async (query, apiName) => {

  logger.debug({
    API: apiName,
    query: query,
  });

  try {
    connection.beginTransaction() // 트랜잭션 적용 시작
   

    const res1 = await mySQLQuery(changeWriter(query, apiName));
    logger.debug({
      API: apiName,
      res1: res1,
      affectedRows: res1.affectedRows,
    });
    if (res1.affectedRows != 1) return 1005;


    connection.commit() // 커밋
    return 2000

  } catch (err) {
    console.log("롤백 err : "+err)
    connection.rollback() // 롤백
    return 9999;
  } 
}; 


/** 책제목 수정
 */
storybookMng.prototype.editTitle = async (query, apiName) => {

  logger.debug({
    API: apiName,
    query: query,
  });

  try {
    connection.beginTransaction() // 트랜잭션 적용 시작
   

    const res1 = await mySQLQuery(changeTitle(query, apiName));
    logger.debug({
      API: apiName,
      res1: res1,
      affectedRows: res1.affectedRows,
    });
    if (res1.affectedRows != 1) return 1005;


    connection.commit() // 커밋
    return 2000

  } catch (err) {
    console.log("롤백 err : "+err)
    connection.rollback() // 롤백
    return 9999;
  } 
}; 


/** 스토리 개별 수정
 */
storybookMng.prototype.editStory = async (query, apiName) => {

  logger.debug({
    API: apiName,
    query: query,
  });

  try {
    connection.beginTransaction() // 트랜잭션 적용 시작

    // 형변환 str->int
    const bookPage = query.book_page;
    const pageMappings = {
        'book_cover': 0,
        'page1': 1,
        'page2': 2,
        'page3': 3,
        'page4': 4,
        'page5': 5,
        'page6': 6
    };
    let page = pageMappings[bookPage] || -1;
   

    const res1 = await mySQLQuery(changeStory(query, page, apiName));
    logger.debug({
      API: apiName,
      res1: res1,
      affectedRows: res1.affectedRows,
    });
    if (res1.affectedRows != 1) return 1005;


    connection.commit() // 커밋
    return 2000

  } catch (err) {
    console.log("롤백 err : "+err)
    connection.rollback() // 롤백
    return 9999;
  } 
}; 



// /** 이미지 URL 개별 수정
//  */
// storybookMng.prototype.editImageUrl = async (query, apiName) => {

//   logger.debug({
//     API: apiName,
//     query: query,
//   });


//   try {
//     connection.beginTransaction() // 트랜잭션 적용 시작
   

//     // 1. 책정보 수정 - update 됐는지 확인
//     const res1 = await mySQLQuery(changeImageUrl(query, apiName));
//     logger.debug({
//       API: apiName,
//       res1: res1,
//       affectedRows: res1.affectedRows,
//     });
//     if (res1.affectedRows != 1) return 1005;


//     connection.commit() // 커밋
//     return 2000

//   } catch (err) {
//     console.log("롤백 err : "+err)
//     connection.rollback() // 롤백
//     return 9999;
  
//   } finally {
//     // connection.end() // connection 회수  -> mysql 에러 원인
//   }

// }; 



/** 스토리북 수정 
 * 1. 스토리북 책 수정
 * 2. 스토리 수정
 * 3. 프롬프트 수정
 */
storybookMng.prototype.editBook = async (query, apiName) => {

  logger.debug({
    API: apiName,
    query: query,
  });


  try {
    connection.beginTransaction() // 트랜잭션 적용 시작
   

    // 1. 책정보 수정 - update 됐는지 확인
    const res1 = await mySQLQuery(changeBook(query, apiName));
    logger.debug({
      API: apiName,
      res1: res1,
      affectedRows: res1.affectedRows,
    });
    if (res1.affectedRows != 1) return 1005;



    // 3.스토리 수정
    for (let i = 1; i <= 6; i++) {
      const page_content = query.book_content[`page${i}`];
      const res3 = await mySQLQuery(changeStrories(query, i, page_content, query.book_id, apiName));
      logger.debug({
        API: apiName,
        i: i,
        res3: res3,
      });
    }


    // 4. 프롬프트 수정
    for (let i = 1; i <= 6; i++) {
      let image_prompt = query.image_prompt[`page${i}`];
      if(i == 0) image_prompt = query.image_prompt[`cover_page`];
      const res4 = await mySQLQuery(changePrompt(query, i, image_prompt, query.book_id, apiName));
      logger.debug({
        API: apiName,
        i: i,
        res4: res4,
      });
    }


    connection.commit() // 커밋
    return 2000

  } catch (err) {
    console.log("롤백 err : "+err)
    connection.rollback() // 롤백
    return 9999;
  
  } finally {
    // connection.end() // connection 회수  -> mysql 에러 원인
  }

}; 


/** 이미지 편집화면 조회
 * - 사용자가 만든 모든 책의 목록을 보여준다. 
 */
storybookMng.prototype.getAllImages = async (query, apiName) => {

  logger.debug({
    API: apiName,
    query: query,
  });


  // 이미지 url 저장 
  const res1 = await mySQLQuery(getBookInfo(query, apiName));
  const res2 = await mySQLQuery(getStories(query, apiName));
  const res3 = await mySQLQuery(getImagePrompts(query, apiName));
  const res4 = await mySQLQuery(getImageUrls(query, apiName));
  if (res1.length === 0) {
    return 1005 // issue_date: res1[0].issue_date 부분이 에러나서 예외처리
  }


  // 새로운 객체 생성
  const book_content = {};
  res2.forEach((item) => {
    const key = `page${item.book_page}`;
    book_content[key] = item.book_content;
  });

  const image_prompt = {};
  res3.forEach(item => {
    let pageKey = `page${item.book_page}`;
    if (pageKey == 'page0') pageKey = 'cover_page'
    image_prompt[pageKey] = item.image_prompt;
  });
  
  const img_url = {};
  res4.forEach((item) => {
    let pageKey = `page${item.book_page}`;
    if (pageKey == 'page0') pageKey = 'cover_page'
    img_url[pageKey] = item.img_url;
    if(item.img_url == undefined) img_url[pageKey] = '' // 빈값예외처리
  });
  
  logger.debug({
    API: apiName,
    res1: res1,
    // img_url: img_url,
    // res3: res3,
    // image_prompt: image_prompt
    // book_character: book_character,
  });

  // res1, res2, res3 합치기
  const result = {
    issue_date: res1[0].issue_date,
    book_name: res1[0].book_name,
    book_writer: res1[0].book_writer,
    book_content: book_content,
    image_prompt: image_prompt,
    img_url: img_url,
  }
  return result;
}; 


/** 글편집 조회
 * - 사용자가 만든 모든 책의 목록을 보여준다. 
 */
storybookMng.prototype.getAllStories = async (query, apiName) => {

  logger.debug({
    API: apiName,
    query: query,
  });


  // 이미지 url 저장 
  const res1 = await mySQLQuery(getBookInfo(query, apiName));
  const res2 = await mySQLQuery(getStories(query, apiName));
  const res3 = await mySQLQuery(getCharacters(query, apiName));
  if (res1.length == 0 || res2.length == 0 || res3.length == 0) return 1005


  // 새로운 객체 생성
  const book_content = {};
  res2.forEach((item) => {
    const key = `page${item.book_page}`;
    book_content[key] = item.book_content;
  });
  const book_character = getBookNameDesc(res3);
  
  logger.debug({
    API: apiName,
    res1: res1,
    book_content: book_content,
    res3: res3,
    res3type: res3.type,
    book_character: book_character,
  });

  // res1, res2, res3 합치기
  const result = {
    issue_date: res1[0].issue_date,
    book_name: res1[0].book_name,
    book_outline: res1[0].book_outline,
    book_writer: res1[0].book_writer,
    book_content : book_content,
    book_character : book_character
  }
  return result;
}; 



/** 스토리북 만들기 
 * 1. 스토리북 책 생성
 * 2. 캐릭터 저장
 * 3. 스토리 저장
 * 4. 프롬프트 저장
 */
storybookMng.prototype.createbook = async (query, apiName) => {

  logger.debug({
    API: apiName,
    query: query,
  });


  try {
    connection.beginTransaction() // 트랜잭션 적용 시작
   

    // 1. 책생성 - insert 됐는지 확인
    const res1 = await mySQLQuery(createbook(query, apiName));
    logger.debug({
      API: apiName,
      res1: res1,
    });
    book_id = res1.insertId;
    if (book_id == null) return 9999;


    // 2. 캐릭터 저장 - insert 됐는지 확인
    // 3개의 캐릭터
    mainChar = query.book_character.mainChar; // mainChar: { name: '주인공이름', description: '캐릭터에 대한 자세한 표현' },
    subChar = query.book_character.subChar;
    subChar2 = query.book_character.subChar2;
    const res2_main = await mySQLQuery(saveCharacterName(query, mainChar, 0, book_id, apiName));
    const res2_sub = await mySQLQuery(saveCharacterName(query, subChar, 1, book_id, apiName));
    const res2_sub2 = await mySQLQuery(saveCharacterName(query, subChar2, 2, book_id, apiName));
    logger.debug({
      API: apiName,
      res2_main: res2_main,
      res2_sub: res2_sub,
      res2_sub2: res2_sub2,
    });
    if (res2_main.insertId == null || res2_sub.insertId == null || res2_sub2.insertId == null) return 9999;


    // 3.스토리 저장
    for (let i = 1; i <= 6; i++) {
      const page_content = query.book_content[`page${i}`];
      const res3 = await mySQLQuery(saveStrories(query, i, page_content, book_id, apiName));
      logger.debug({
        API: apiName,
        i: i,
        res3: res3,
      });
    }


    // 4. 프롬프트 저장
    for (let i = 1; i <= 6; i++) {
      const image_prompt = query.image_prompt[`page${i}`];
      const res4 = await mySQLQuery(savePrompt(query, i, image_prompt, book_id, apiName));
      logger.debug({
        API: apiName,
        i: i,
        res4: res4,
      });
    }


    connection.commit() // 커밋


    let today = new Date();
    let today_formed = formatDate(today)
    return {
      book_id: book_id,
      issue_date: today_formed
    };

  } catch (err) {
    console.log("롤백 err : "+err)
    connection.rollback() // 롤백
    return 9999;
  
  } finally {
    // connection.end() // connection 회수  -> mysql 에러 원인
  }

}; 


/** 이미지 url 저장
 * - AI서버에서 만들어서 S3에 저장된 상태
 * - url만 DB에 저장한다. 
 * 1. url저장되어있는지 확인
 * 2. 책저장(insert문) or 책업데이트(update문)
 */
storybookMng.prototype.saveImageUrl = async (query, apiName) => {

  logger.debug({
    API: apiName,
    query: query,
  });

  try {
    connection.beginTransaction() // 트랜잭션 적용 시작
         

    // 1. url저장되어있는지 확인
    const res1 = await mySQLQuery(findImageUrl(query, apiName));
    logger.debug({
      API: apiName,
      res1: res1,
      res1length: res1.length,
    });


    if (res1.length == 0) {
      if (query.book_page > 6) return 1005; // 예외처리 - 6페이지까지만 생성가능
      const res2 = await mySQLQuery(saveImageUrl(query, apiName));
      img_id = res2.insertId;
      logger.debug({
        API: apiName,
        res2: res2,
        affectedRows: res2.affectedRows,
      });
      if (img_id == null) return 9999;
      connection.commit() // 커밋
      return 2000;


    } else {
      const res3 = await mySQLQuery(changeImageUrl(query, apiName));
      logger.debug({
        API: apiName,
        res3: res3,
        affectedRows: res3.affectedRows,
      });
      if (res3.affectedRows == 0) return 1005;
      connection.commit() // 커밋
      return 2000;
    }


  } catch (err) {
    console.log("롤백 err : " + err)
    connection.rollback() // 롤백
    return 9999;
  } 

}; 


/** 책장 조회
 * - 사용자가 만든 모든 책의 목록을 보여준다. 
 */
storybookMng.prototype.getAllBooks = async (query, apiName) => {

  logger.debug({
    API: apiName,
    query: query,
  });


  // 이미지 url 저장 
  const res = await mySQLQuery(getAllBooks(query, apiName));

  // books 배열을 숫자로 묶어진 객체로 변경
  const modifiedBooks = {};
  res.forEach((book, index) => {
    modifiedBooks[index] = {
      book_id: book.book_id,
      book_name: book.book_name,
      img_url: book.img_url,
    };
  });

  logger.debug({
    API: apiName,
    res: res,
  });
  return { books :modifiedBooks};
}; 



//------------------------------------------------------

// Date 객체 to 'yyyy-mm-dd' 함수
function formatDate(date) {
  let dd = String(date.getDate()).padStart(2, '0');
  let mm = String(date.getMonth() + 1).padStart(2, '0'); // January is 0!
  let yyyy = date.getFullYear();
  return yyyy + '년 ' + mm + '월 ' + dd + '일';
}


function getBookNameDesc(res) {
  // type에 따라 키를 할당
  mainChar = {}
  subChar = {}
  subChar2 = {}

  for (i = 0; i < 3; i++) {
    switch (res[i].type) {
      case 0:
        mainChar = {
          name: res[i].name,
          description: res[i].description
        };
      case 1:
        subChar = {
          name: res[i].name,
          description: res[i].description
        };
      case 2:
        subChar2 = {
          name: res[i].name,
          description: res[i].description
        };
      default:
        // 예외 처리: type이 0, 1, 2가 아닌 경우
        console.error('Unexpected type:', res[i].type);
    }
  }
  return {
    mainChar: mainChar,
    subChar: subChar,
    subChar2: subChar2
  }
}


// 일기사진 조회 쿼리문 작성 2
function findImgUrlForS3(query, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "findImgUrlForS3()",
  });

  return {
    text: `
            SELECT bucket, s3key
            FROM STORYBOOK_IMAGE
            where book_id = ?
          `,
    params: [query.book_id],
  };
}

// 이미지 url 조회
function findImageUrl(query, apiName) {
  
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "findImageUrl()",
  });

  return {
    text: `
          select *
          from STORYBOOK_IMAGE 
          where book_id = ? and book_page = ?
          `,
    params: [query.book_id, query.book_page],
  };
}


// 이미지 url 삭제
function deleteImgUrl(query, url, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    url: url,
    function: "deleteImgUrl()",
  });

  return {
    text: `
          DELETE FROM STORYBOOK_IMAGE
          WHERE book_id = ? 
          `,
    params: [query.book_id],
  };
}


// 프롬프트 삭제
function deletePrompt(query, url, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    url: url,
    function: "deletePrompt()",
  });

  return {
    text: `
          DELETE FROM STORYBOOK_PROMPT
          WHERE book_id = ? 
          `,
    params: [query.book_id],
  };
}


// 캐릭터 삭제
function deleteChar(query, url, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    url: url,
    function: "deleteChar()",
  });

  return {
    text: `
          DELETE FROM STORYBOOK_CHARACTER
          WHERE book_id = ? 
          `,
    params: [query.book_id],
  };
}


// 스토리 삭제
function deleteStory(query, url, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    url: url,
    function: "deleteStory()",
  });

  return {
    text: `
          DELETE FROM STORYBOOK_STORY
          WHERE book_id = ? 
          `,
    params: [query.book_id],
  };
}


// 책 1권 삭제
function deleteBook(query, url, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    url: url,
    function: "deleteBook()",
  });

  return {
    text: `
          DELETE FROM STORYBOOK
          WHERE book_id = ? 
          `,
    params: [query.book_id],
  };
}


// 작가이름 수정
function changeWriter(query, url, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    url: url,
    function: "changeWriter()",
  });

  return {
    text: `
          UPDATE STORYBOOK
          SET book_writer = ?
          WHERE space_id = ? and book_id = ? 
          `,
    params: [query.book_writer, query.space_id, query.book_id],
  };
}


// 책제목 수정
function changeTitle(query, url, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    url: url,
    function: "changeTitle()",
  });

  return {
    text: `
          UPDATE STORYBOOK
          SET book_name = ?
          WHERE space_id = ? and book_id = ? 
          `,
    params: [query.book_name, query.space_id, query.book_id],
  };
}


// 스토리 개별 수정
function changeStory(query, page, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    function: "changeStory()",
  });

  return {
    text: `
          UPDATE STORYBOOK_STORY
          SET book_content = ?
          WHERE book_page = ? and book_id = ? 
          `,
    params: [query.book_content, page, query.book_id],
  };
}


// 이미지 URL 개별 수정
function changeImageUrl(query, url, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    url: url,
    function: "changeImageUrl()",
  });

  return {
    text: `
          UPDATE STORYBOOK_IMAGE
          SET img_url = ?, s3key = ?
          WHERE book_page = ? and book_id = ? 
          `,
    params: [query.img_url, query.S3key, query.book_page, query.book_id],
  };
}


// 이미지 프롬프트 수정
function changePrompt(query, book_page, image_prompt, book_id, apiName) {
  
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "changePrompt()",
  });

  return {
    text: `
            UPDATE STORYBOOK_PROMPT
            SET image_prompt = ?
            WHERE book_id = ? and book_page = ?
          `,
    params: [image_prompt, book_id, book_page],
  };
}


// 스토리 수정
function changeStrories(query, book_page, book_content, book_id, apiName) {
  
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "changeStrories()",
  });

  return {
    text: `
            UPDATE STORYBOOK_STORY
            SET book_content = ?
            WHERE book_id = ? and book_page = ?
          `,
    params: [book_content, book_id, book_page],
  };
}


// 책 줄거리, 이름 수정
function changeBook(query, url, apiName) {
  logger.debug({
    API: apiName + " 쿼리문 작성",
    params: query,
    url: url,
    function: "changeBook()",
  });

  return {
    text: `
          UPDATE STORYBOOK
          SET book_name = ?, book_outline = ?
          WHERE book_id = ?
          `,
    params: [query.book_name, query.book_outline, query.book_id],
  };
}


// 1권에 대한 이미지url 리스트 조회
function getImageUrls(query, apiName) {
  
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "getImageUrls()",
  });

  return {
    text: `
          select promt_id, book_page, image_prompt
          from STORYBOOK_PROMPT 
          where book_id = ?
          ORDER BY book_page
          `,
    params: [query.book_id],
  };
}


// 1권에 이미지 프롬프트 리스트 조회
function getImagePrompts(query, apiName) {
  
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "getImagePrompts()",
  });

  return {
    text: `
          select promt_id, book_page, image_prompt
          from STORYBOOK_PROMPT 
          where book_id = ?
          ORDER BY book_page
          `,
    params: [query.book_id],
  };
}


// 1권에 대한 캐릭터 조회
function getCharacters(query, apiName) {
  
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "getCharacters()",
  });

  return {
    text: `
          select type, name, description
          from STORYBOOK_CHARACTER 
          where book_id = ?
          `,
    params: [query.book_id],
  };
}


// 1권에 대한 스토리 조회
function getStories(query, apiName) {
  
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "getStories()",
  });

  return {
    text: `
          select book_page, book_content
          from STORYBOOK_STORY 
          where book_id = ?
          `,
    params: [query.book_id],
  };
}


// 1권에 대한 책정보 조회
function getBookInfo(query, apiName) {
  
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "getBookInfo()",
  });

  return {
    text: `
          select book_name, book_outline, book_writer, DATE_FORMAT(create_at, '%Y년 %m월 %d일') AS issue_date
          from STORYBOOK 
          where book_id = ?
          `,
    params: [query.book_id],
  };
}


// 책장 조회
function getAllBooks(query, apiName) {
  
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "getAllBooks()",
  });

  return {
    text: `
          SELECT sb.book_id, sb.book_name, sbi.book_page, sbi.img_url
          FROM STORYBOOK sb
          LEFT JOIN (
              SELECT book_id, book_page, img_url
              FROM STORYBOOK_IMAGE
              WHERE book_page = 0
          ) sbi ON sb.book_id = sbi.book_id
          WHERE sb.space_id = ?;
          `,
    params: [query.space_id],
  };
}


// 이미지 url 저장
function saveImageUrl(query, apiName) {
  
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "saveImageUrl()",
  });

  return {
    text: `
            INSERT INTO STORYBOOK_IMAGE 
            (book_id, book_page, img_url, bucket, s3key, create_at) 
            VALUES (?, ?, ?, ?, ?, now())
          `,
    params: [query.book_id, query.book_page, query.img_url, "rb2web-storybook", query.S3key],
  };
}


// 이미지 프롬프트 저장
function savePrompt(query, book_page, image_prompt, book_id, apiName) {
  
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "savePrompt()",
  });

  return {
    text: `
            INSERT INTO STORYBOOK_PROMPT 
            (book_id, book_page, image_prompt, create_at) 
            VALUES (?, ?, ?, now())
          `,
    params: [book_id, book_page, image_prompt],
  };
}


// 스토리 저장
function saveStrories(query, book_page, book_content, book_id, apiName) {
  
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "saveStrories()",
  });

  return {
    text: `
            INSERT INTO STORYBOOK_STORY 
            (book_id, book_page, book_content, create_at) 
            VALUES (?, ?, ?, now())
          `,
    params: [book_id, book_page, book_content],
  };
}


// 캐릭터 이름 저장
function saveCharacterName(query, character, type, book_id, apiName) {

  logger.debug({
    API: apiName + " 쿼리문 작성",
    character: character,
    function: "saveCharacterName()",
  });

  return {
    text: `
          INSERT INTO STORYBOOK_CHARACTER 
          (book_id, type, name, description, create_at) 
          VALUES (?, ?, ?, ?, now())
          `,
    params: [book_id, type, character.name, character.description],
  };
}


// 책 생성
function createbook(query, apiName) {
  
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "createbook()",
  });

  return {
    text: `
          INSERT INTO STORYBOOK 
          (space_id, book_name, book_writer, book_outline, create_at) 
          VALUES (?, ?, ?, ?, now())
          `,
    params: [query.space_id, query.book_name, query.book_writer, query.book_outline],
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
module.exports = new storybookMng(); // userMng 모듈 export