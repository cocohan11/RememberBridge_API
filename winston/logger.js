// winston/logger.js
// 1. 설치한 모듈 및 사용할 함수 불러오기, 저장 위치 정의하기
const winston = require("winston");
const winstonDaily = require("winston-daily-rotate-file");
const appRoot = require("app-root-path");
const { createLogger } = require("winston");
const process = require("process"); // 프로그램과 관련된 정보를 나타내는 객체 모듈
const logDir = `${appRoot}/logs`; // logs 디렉토리 하위에 로그 파일 저장
const colorizer = winston.format.colorize();
const { combine, timestamp, printf } = winston.format;
/** Logging Levels
{
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
}
*/
const myCustomLevels = {
  levels: {
    error: 0,
    http: 1,
    info: 2,
    debug: 3,
  },
  colors: {
    error: 'red yellowBG',
    http: 'cyan', // 파란색
    info: 'green',
    debug: 'magenta', // 자주색
  }
};
colorizer.addColors(myCustomLevels.colors);

//* log 출력 포맷 정의 함수
const logFormat = printf(({ timestamp, level, message }) => {
    return `${timestamp}  [${level}]:  ${message}`; // 날짜 [시스템이름] 로그레벨 메세지
 });

const logger = createLogger({
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    // label({ label: "rembridge" }), // 어플리케이션 이름
    logFormat // log 출력 포맷
    //? format: combine() 에서 정의한 timestamp와 label 형식값이 logFormat에 들어가서 정의되게 된다. level이나 message는 콘솔에서 자동 정의
  ),
  // 포맷 종류에는 simple과 combine 있음, winston이용시에는 combine을 주로 인용
  transports: [
    new winstonDaily({
      // log 파일 설정
      level: "debug", // 레벨 0~3까지 로그파일에 저장됨
      datePattern: "YYYY-MM-DD", // 날짜포맷방식
      dirname: logDir, // 디렉토리 파일 이름 설정
      filename: "%DATE%.log", // 파일이름 설정, %DATE% - 자동으로 날짜가 들어옴
      maxSize: "10m", // 로그파일 크기, 정의하지 않으면 데이터가 쌓이고, 제안하면 초과시 앞의 데이터를 지움
      maxFiles: "7d", // 최근 7일치 로그 파일만 보관
    }),
    new winstonDaily({
      // 로그 파일 설정
      level: "error", // 심각도
      datePattern: "YYYY-MM-DD",
      dirname: logDir, // 디렉토리 파일 이름 설정
      filename: "%DATE%.error.log", // 파일이름 설정, 에러파일을 구분해 별도보관
      maxSize: "10m", // 로그파일 크기
      maxFiles: "7d", // 최근 7일치 로그 파일만 보관
    }),
  ],
});

logger.add(
    new winston.transports.Console({
      level: 'debug', // 레벨 0~3까지 콘솔에 출력됨
      format: winston.format.combine(
        winston.format.colorize({ all: true }), // 카테고리뿐만아니라 전체문자열 색상화
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp}  [${level}]:  ${message}`;
        })
      ),
    })
  );
  

// 4. logger 내보내기
module.exports = logger;
