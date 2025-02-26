
![46](https://github.com/user-attachments/assets/62c0b817-7037-4db3-bd8d-5299d47a2b47)



# 리멤버브릿지 Web API 프로젝트
- 서비스 도메인: https://rembridge.shop/

## 목차
- 로컬에서 서버 실행방법
- 상용서버 실행방법
- Teck Stack
  
## 로컬에서 서버 실행방법
0. 원격지 소스코드 pull받은 뒤, .env 파일(db연결 등 환경정보 셋팅) 생성하기
    `* 주의점! .env파일은 프로젝트 루트 경로에 위치해야함!!`
1. 프로젝트 경로 진입
2. 명령어 실행 `sudo su`
3. 명령어 실행 `node index.js` or `nodemon index.js`

## 상용서버 실행방법
1. 프로젝트 경로 진입
2. 명령어 실행 `sudo su`
3. 명령어 실행 `node index.js` or `nodemon index.js`


## Teck Stack
- OS: Ubuntu
- Node version: v12.22.9
- expressjs version: 4.18.2
- DB: mysql 2.18.1
- 사용라이브러리
    - "@aws-sdk/client-s3": "^3.428.0",
    - "aws-sdk": "^2.1472.0",
    - "multer-s3": "^3.0.1",
    - "nodemailer": "^6.9.5",
    - "axios": "^1.5.1",
    - "bcrypt": "^5.1.1",
    - "body-parser": "^1.20.2",
    - "multer": "^1.4.5-lts.1",
    - "camelcase-keys": "^9.0.0",
    - "cookie-parser": "^1.4.6",
    - "cors": "^2.8.5",
    - "dotenv": "^16.3.1",    
    - "jsonwebtoken": "^9.0.2",
- 로깅용 라이브러리
    "morgan": "^1.10.0",       
    "nodemon": "^3.0.1",
    "winston": "^3.11.0",
    "winston-daily-rotate-file": "^4.7.1"
- 소스코드 모니터링 및 서버 자동시작 유틸리티: nodemon, pm2 사용
