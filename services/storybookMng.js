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
function storybookMng() {}

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


  return 2000;
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


  // 이미지 url 저장 
  const res = await mySQLQuery(saveImageUrl(query, apiName));
  img_id = res.insertId;
  logger.debug({
    API: apiName,
    res: res,
    img_id: img_id,
  });

  
  if (img_id == null) return 9999;
  return 2000;
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
function saveImageUrl(query, apiName) {
  
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
    params: [query.book_id, query.book_page, query.img_url],
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