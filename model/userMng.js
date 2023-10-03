/** 회원정보 비지니스 로직 */
const dbPool = require('../util/dbPool');
// const camelcaseKeys = require('camelcase-keys'); //카멜케이스로 DB컬럼값을 응답하기 위한 모듈 선언
const connection = dbPool.init();
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const resCode = require('../util/resCode');

let message; //응답 메세지 전역변수 선언
function userMng() {}




/** 회원 정보 조회 */
userMng.prototype.getUser = (query) => {
    console.log('query %o:', query);
  
    // 회원가입 쿼리문 날리기
    return new Promise(async (resolve, reject) => {
        console.log(`회원가입 쿼리문 날리기`)
        mySQLQuery(queryGetUser(query)) // 쿼리문 실행 / await로 동기화
        .then((res) => { 
            user = res[res.length - 1];
            console.log('res length is:', res.length);
            console.log('user is:', user);
            if (res.length == 0) return resolve(1005);
            else return resolve(user); // TODO : pw 제외하고 응답하기
        })
        .catch((err) => {
            console.log(`selectUser() err: ${err} `)
            return resolve(9999); 
        });
    }); 
}


/** JWT 발급(access, refresh token) */
userMng.prototype.signJWT = (userInfo) => {
    console.log("userMng.prototype.signJWT");
    console.log(userInfo);

    // 토큰 발급
    if (!userInfo) { 
        console.log('!userInfo');
        res.json("login fail");
        
    } else {
        console.log('userInfo.user_email : '+userInfo.user_email);
        try {
            // accessToken 발급
            console.log(userInfo.user_id);
            const accessToken = jwt.sign({
                user_id: userInfo.user_id,
                user_name: userInfo.user_name,
                user_email: userInfo.user_email,
            }, "accesssecret", {
                expiresIn: '1m',
                issuer : 'About Tech han2',
            });
            // refresh Token 발급
            const refreshToken = jwt.sign({
                user_id: userInfo.user_id,
                user_name: userInfo.user_name,
                user_email: userInfo.user_email,
            }, "refreshsecret", {
                expiresIn: '3m',
                issuer : 'About Tech han2',
            });
            console.log(accessToken);
            console.log(refreshToken);

            return result = {
                accessToken,
                refreshToken,
            }
        } catch {
        }
    }
    
}


/** SNS 회원가입 */
userMng.prototype.addSnsUser = (query) => {

    // SNS 회원가입 쿼리문 작성
    async function insertSnsUser(query) {
        console.log(`SNS 회원가입 쿼리문 작성`)
        console.log('query %o:', query);

        return {
            text: `INSERT INTO USER 
                    (user_email, user_state, user_name, login_sns_type, create_at) 
                    VALUES (?, 'N', ?, ?, now())`, 
            params: [query.user_email, query.user_name, query.login_sns_type] 
        };
    }
  
    // SNS 회원가입 쿼리문 날리기
    return new Promise(async (resolve, reject) => {
        console.log(`회원가입 쿼리문 날리기`)
        mySQLQuery(await insertSnsUser(query)) // 쿼리문 실행 
        .then((res) => { 
            return resolve(2000); // USER테이블에 회원가입 완료
        })
        .catch((err) => {
            console.log(`insertSnsUser() err: ${err} `)
            return resolve(9999); 
        });
    }); 
}


/** 회원탈퇴 (일반, SNS 유저 포함)*/
userMng.prototype.leaveUser = (query) => { // 논리삭제 (물리삭제X)
    // 회원탈퇴 쿼리문 작성
    async function leaveUser(query) {
        console.log(`일반회원 회원탈퇴 쿼리문 작성`)
        console.log('query %o:', query);
        
        return {
            text: `UPDATE USER 
                    SET user_state = 'L', leave_at = now()
                    WHERE user_email = ?`, 
            params: [query.user_email] 
        };
    }
    
    // 회원탈퇴 쿼리문 날리기
    return new Promise(async (resolve, reject) => {
        console.log(`회원탈퇴 쿼리문 날리기`)
        mySQLQuery(await leaveUser(query)) // 쿼리문 실행 
            .then(async (res) => { 
                if (res.changedRows == 1) return resolve(2000);
                if (res.changedRows != 1) return resolve(1005);
        })
        .catch((err) => {
            console.log(`changePassword() err: ${err} `)
            return resolve(9999); 
        });
    }); 
}


/** 비밀번호 임시발급 
 * 1. 이메일 조회
 * 2. 이메일 전송
 * 3. 비밀번호 변경
*/
userMng.prototype.tempPassword = async (query) => {
    return new Promise(async (resolve, reject) => {
        const randomCode = await createRandomCode(6); // 6자리
        const emailTitle = '[레인보우 브릿지] 임시 비밀번호 발급';
        const emailContent = `[레인보우 브릿지]에서 임시 비밀번호를 발급해드립니다.
                            \n임시 비밀번호 : ${randomCode}
                            \n
                            \n사이트로 돌아가서 임시 비밀번호로 로그인해주세요.`;
        console.log('randomCode is %o:', randomCode);

        // 이메일 조회
        console.log(`이메일 조회 쿼리문 날리기`)
        mySQLQuery(queryGetUser(query)) // 쿼리문 실행 
            .then(async (res) => { 
                console.log('res length is:', res.length);
                if (res.length == 0) { // DB에 해당 이메일이 없음 -> 실패응답
                    console.log('return 2009');
                    resolve(2009);
                } else {
                    sendResult = await sendEmail(query, emailTitle, emailContent, randomCode); // 이메일 전송
                    result = await queryChangePassword(query); // 비밀번호 변경
                    
                    console.log('이메일 전송 결과:', sendResult);
                    console.log('result is %o:', result);
                
                    resolve(result); // Promise가 성공 상태로 변경되며 결과를 반환
                }
        })
        .catch((err) => {
            console.log(`tempPassword() err: ${err} `)
            reject(9999);
        });
    });
}


/** 비밀번호 변경 */
userMng.prototype.changePassword = (query) => {
    queryChangePassword(query);
}


/** 이메일 인증 
 * 1. 이메일 중복 확인 (수정중)
 * 2. 이메일 전송
 * 3. 인증번호 응답
*/
userMng.prototype.sendEmail = async (query) => {
    const randomCode = await createRandomCode(6); // 6자리
    const emailTitle = '[레인보우 브릿지] 이메일 인증번호';
    const emailContent = `[레인보우 브릿지]에서 이메일 인증번호 안내드립니다.
                        \n인증번호 : ${randomCode}
                        \n
                        \n사이트로 돌아가서 이메일 인증번호를 입력해주세요.`;
    console.log('randomCode is %o:', randomCode);

    // return new Promise(async (resolve, reject) => {
    //     console.log('query :', query);

    //     // 이메일 조회
    //     console.log(`이메일 조회 쿼리문 날리기`)
    //     mySQLQuery(queryGetUser(query)) // 쿼리문 실행 
    //         .then(async (res) => { 
    //             console.log('res length is:', res.length);
    //             if (res.length == 0) { // DB에 해당 이메일이 없음 -> 회원가입 가능 -> 성공
    //                 console.log('return 2000');
    //                 resolve(2000);
    //             } else {
    //                 console.log('return 1009');
    //                 resolve(1009); // DB에 해당 이메일 있음 -> 회원가입 불가 -> 실패(중복)
    //             }
    //     })
    //     .catch((err) => {
    //         console.log(`tempPassword() err: ${err} `)
    //         reject(9999);
    //     });
    // });
    const emailVerificationCode = await sendEmail(query, emailTitle, emailContent, randomCode);
    return emailVerificationCode;
}


/** 일반회원 로그인 */
userMng.prototype.loginUser = (query) => {

    // 비밀번호 복호화
    async function matchHashPassword(pw, pwfromDB) {
        const isMatch = await bcrypt.compare(pw, pwfromDB)
        console.log(pw)
        console.log(pwfromDB)
        console.log(isMatch)
        return isMatch;
    }
  
    // 회원가입 쿼리문 날리기
    return new Promise((resolve, reject) => {
        console.log(`회원가입 쿼리문 날리기`)
        mySQLQuery(queryGetUser(query)) // 쿼리문 실행 
            .then(async (res) => { 
                isMatch = await matchHashPassword(query.user_pw, res[res.length-1].user_pw); // 임시) 해당이멜로조회된 제일 최신 user를 리턴한다.
                console.log('res[0].user_pw %o:', res[res.length-1].user_pw);
                console.log(`isMatch: ${isMatch} `)
                if (isMatch == true) return resolve(res[res.length-1]); 
                if (isMatch == false) return resolve(1005); 
        })
        .catch((err) => {
            console.log(`loginUser() err: ${err} `)
            return resolve(9999); 
        });
    }); 
}


/** 일반 회원가입 */
userMng.prototype.addUser = (query) => {

    // 회원가입 쿼리문 작성
    async function insertUser(query) {
        console.log(`회원가입 쿼리문 작성`)
        console.log('query %o:', query);
        user_pw = await toHashPassword(query.user_pw);
        console.log('user_pw %o:', user_pw);

        // 만들 조건문 : sns회원인지 일반회원인지
        // 비번 해싱
        
        return {
            text: `INSERT INTO USER 
                    (user_email, user_pw, user_state, user_name, login_sns_type, create_at) 
                    VALUES (?, ?, 'N', ?, ?, now())`, 
            params: [query.user_email, user_pw, query.user_name, query.login_sns_type] 
        };
    }
  
    // 회원가입 쿼리문 날리기
    return new Promise(async (resolve, reject) => {
        console.log(`회원가입 쿼리문 날리기`)
        mySQLQuery(await insertUser(query)) // 쿼리문 실행 / await로 동기화
        .then((res) => { 
            return resolve(2000); // USER테이블에 회원가입 완료
        })
        .catch((err) => {
            console.log(`insertUser() err: ${err} `)
            return resolve(9999); 
        });
    }); 
}

//ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ

// 일반회원 로그인 쿼리문 작성
function queryGetUser(query) {
    console.log(`일반회원 로그인 쿼리문 작성`)
    console.log('query %o:', query);

    return {
        text: `SELECT * FROM USER 
                WHERE
                user_email = ?;`, 
        params: [query.user_email] 
    };
}

// 비밀번호 변경 쿼리문 날리기
function queryChangePassword(query) {
    return new Promise(async (resolve, reject) => {
        console.log(`비밀번호 변경 쿼리문 날리기`)
        mySQLQuery(await changePassword(query)) // 쿼리문 실행 
            .then(async (res) => { 
                if (res.changedRows == 1) return resolve(2000);
                if (res.changedRows != 1) return resolve(1005);
        })
        .catch((err) => {
            console.log(`changePassword() err: ${err} `)
            return resolve(9999); 
        });
    }); 
}

// 일반회원 비밀번호 변경/임시 비밀번호 발급 쿼리문 작성
async function changePassword(query) {
    console.log(`일반회원 비밀번호 변경 쿼리문 작성`)
    console.log('query %o:', query);
    if (!query.user_pw) { // 임시비밀번호
        randomCode = createRandomCode(3);
        user_pw = await toHashPassword(randomCode); // 랜덤값넣기
    } else { // 비밀번호 변경
        user_pw = await toHashPassword(query.user_pw);
    }

    console.log('user_pw is %o:', user_pw);
    return {
        text: `UPDATE USER 
                SET user_pw = ?
                WHERE user_email = ?`, 
        params: [user_pw, query.user_email] 
    };
    
}

// 이메일 전송
function sendEmail(query, mailTile, mailContent, randomCode) {
    return new Promise((resolve, reject) => {
        console.log(`userMng.prototype.sendEmail() query.user_email : ${query.user_email}`);
        console.log(`userMng.prototype.sendEmail() randomCode : ${randomCode}`);

        // nodemailer를 통한 이메일전송 설정
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'rainbowbridge2api@gmail.com',
                pass: 'hnzy ggeb mnuq wknb' // 구글 앱 비밀번호
            }
            });
        var mailOptions = {
            from: 'rainbowbridge2api@gmail.com',
            to: query.user_email,
            subject: mailTile,
            text: mailContent
        };

        // 실제 전송 메소드
        transporter.sendMail(mailOptions, function(error, info){ // 유저 이메일로 인증번호 보내기
            if (error) {
                console.log(error);
                resolve(9999)
            } else {
                // 전송 성공시 인증번호 응답하기
                console.log('Email sent: ' + info.response);
                console.log('randomCode: ' + randomCode);
                resolve(randomCode)
            }
        });
    });
}

// 인증번호 생성
function createRandomCode(size) {
    var randomCode = Math.random().toString(36).substr(2, size); // 난수
    console.log(randomCode);
    return randomCode;
}

// 비밀번호 암호화
async function toHashPassword(pw) {
    const hashedPassword = await bcrypt.hash(pw, 8)
    console.log(pw)
    console.log(hashedPassword)
    return hashedPassword;
    
    // const isMatch = await bcrypt.compare("helloworld1234", hashedPassword)
    // const isnotMatch = await bcrypt.compare("111helloworld1234", hashedPassword)
}

// 재사용할 쿼리 함수 
function mySQLQuery(query) {
    return new Promise(function(resolve, reject) {
        try {
          connection.query(query.text, query.params, function(err, rows, fields) {
                if (err) {
                    return reject(err);
                } else {
                    //순차적으로 실행하면 반환되는 행을 관리
                    // return resolve(camelcaseKeys(rows)); //카멜케이스로 응답해달라는 요구받음
                    return resolve(rows); //카멜케이스로 응답해달라는 요구받음
                }
            });
        } catch (err) {
            return reject(err);
        }
    })
};

//ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ

/** ACCESS TOKEN 유효성 검증 미들웨어 */
userMng.prototype.authMiddleware = (req, res, next) => {
    const apiName = 'ACCESS TOKEN 유효성 검증';
    console.log('authMiddleware');
    
    // read the token from header or url 
    const token = req.headers['access'] 

    // token does not exist
    if (!token) {
        return resCode.returnResponseCode(res, 3002, apiName, null, null);
    }

    // create a promise that decodes the token
    const p = new Promise(
        (resolve, reject) => {
            jwt.verify(token, "accesssecret", (err, decoded) => {
                if(err) reject(err)
                resolve(decoded)
            })
        }
    )

    // if it has failed to verify, it will return an error message
    const onError = (error) => {
        return resCode.returnResponseCode(res, 3009, apiName, null, error.message);
    }

    // process the promise
    p.then((decoded)=>{
        req.decoded = decoded
        next() // 에러없으면 다음 함수 실행된다. 
    }).catch(onError)
}

module.exports = new userMng(); // userMng 모듈 export 