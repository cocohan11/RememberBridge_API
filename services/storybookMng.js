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




/** 이미지 URL 개별 수정
 */
storybookMng.prototype.editImageUrl = async (query, apiName) => {

  logger.debug({
    API: apiName,
    query: query,
  });


  try {
    connection.beginTransaction() // 트랜잭션 적용 시작
   

    // 1. 책정보 수정 - update 됐는지 확인
    const res1 = await mySQLQuery(changeImageUrl(query, apiName));
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
  
  } finally {
    // connection.end() // connection 회수  -> mysql 에러 원인
  }

}; 



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
 */
storybookMng.prototype.saveImageUrl = async (query, apiName) => {

  logger.debug({
    API: apiName,
    query: query,
  });

  try {
    const pageMapping = {
      'cover_page': 0,
      'page1': 1,
      'page2': 2,
      'page3': 3,
      'page4': 4,
      'page5': 5,
    };
    let page = pageMapping[query.book_page] || 0;
    logger.debug({
      API: apiName,
      page: page,
    });
    const result = await mySQLQuery(saveImageUrl(query, page, apiName));
    img_id = result.insertId;
    if (img_id == null) return 9999;
    return 2000;

  } catch (err) {
    console.log("롤백 err : "+err)
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
  logger.debug({
    API: apiName,
    res: res,
  });
  return res;
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
          SET img_url = ?
          WHERE img_id = ? and book_id = ? 
          `,
    params: [query.img_url, query.img_id, query.book_id],
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
            select sb.book_id, sb.book_name, sbi.img_url
            from STORYBOOK as sb
            inner join STORYBOOK_IMAGE as sbi on sbi.book_id = sb.book_id
            where sb.space_id = ? and sbi.book_page = 0
          `,
    params: [query.space_id],
  };
}


// 이미지 url 저장
function saveImageUrl(query, page, apiName) {
  
  logger.debug({
    API: apiName + " 쿼리문 작성",
    query: query,
    function: "saveImageUrl()",
  });

  return {
    text: `
            INSERT INTO STORYBOOK_IMAGE 
            (book_id, book_page, img_url, create_at) 
            VALUES (?, ?, ?, now())
          `,
    params: [query.book_id, page, query.img_url],
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