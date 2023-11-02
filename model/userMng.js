/** 회원정보 비지니스 로직 */

const dbPool = require('../util/dbPool');
// const camelcaseKeys = require('camelcase-keys'); //카멜케이스로 DB컬럼값을 응답하기 위한 모듈 선언
const connection = dbPool.init();
const bcrypt = require("bcrypt"); // 암호화 해시함수
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const resCode = require('../util/resCode'); // 응답코드별 함수
const axios = require('axios'); // http통신모듈
const logger = require("../winston/logger");
require("dotenv").config(); // 환경변수모듈
const {
    JWT_ACCESS_TOKEN_KEY, JWT_REFRESH_TOKEN_KEY,
    KAKAO_REST_API_KEY, KAKAO_REDIRECT_URI, KAKAO_CLIENT_SECRET,
    NAVER_API_KEY, NAVER_SECRET_KEY
} = process.env;
function userMng() {}




/** 유저 정보 수정 - 프사 */
userMng.prototype.setUserImg = async (query, url, apiName) => {
    try {
        logger.debug({
            API: apiName,
            params: query,
            url: url,
        });
        // 유저정보 수정 쿼리문 날리기
        const res = await mySQLQuery(queryChangeUser_img(query, url, apiName));
        logger.debug({
            API: apiName,
            '유저정보 수정 결과': res
        });
        if (res.changedRows == 1) return 2000;
        else return 1005;
        
    } catch (error) {
        logger.error({
            API: apiName,
            error: error
        });
        return 9999;
    }
};


/** accessToken 재발급 */
userMng.prototype.RenewalAccessToken = (refreshToken, apiName) => {
    return new Promise((resolve, reject) => {
        // 토큰 검증하기
        jwt.verify(refreshToken, JWT_REFRESH_TOKEN_KEY, async (error, decoded) => {
            logger.debug({
                API: apiName,
                jwtVerify: `JWT 토큰, 시크릿키 검증함수`,
            });
            if (error) {
                logger.error({
                    API: apiName,
                    error: error
                });
                resolve(3009);
            } else {
                logger.debug({
                    API: apiName,
                    jwtVerify: `JWT 토큰, 시크릿키 검증 OK`,
                });
                if (!refreshToken) {
                    logger.debug({
                        API: apiName,
                        refreshToken: `refreshToken이 비어있다.`,
                    });
                    resolve(3002);
                } else {
                    // refreshToken 토큰의 페이로드에서 사용자정보 가져오기
                    const refresh_userInfo = jwt.decode(refreshToken); // 리프레시토큰의 유저정보
                    // accessToken 새로 발급
                    const accessToken = jwt.sign({
                        user_id: refresh_userInfo.user_id,
                        user_name: refresh_userInfo.user_name,
                        user_email: refresh_userInfo.user_email,
                    }, JWT_ACCESS_TOKEN_KEY, {
                        expiresIn: '1h',
                        issuer : 'About Tech han. new accessToken',
                    });

                    const res = await mySQLQuery(queryGetUser(refresh_userInfo, apiName)) // 쿼리문 실행 
                    logger.debug({
                        API: apiName,
                        res: res,
                        resLength: res.length,
                    });
                    const res_user_info = await selectUserInfo(res[res.length-1]); // 유저정보 5개만 응답하기
                    logger.debug({
                        API: apiName,
                        res_user_info: res_user_info,
                    });

                    // 토큰 응답하기
                    resolve({ // 원하는 출력 모양을 추가함
                        access_token: accessToken,
                        refresh_token: refreshToken,
                        userInfo: res_user_info
                    }) 
                }
            }
        })
    })
}


/** 회원 정보 조회 */
userMng.prototype.getUser = async (query, apiName) => {
    logger.debug({
        API: apiName,
        params: query,
    });

    // 회원 정보 조회 쿼리문 날리기
    const user_info = await mySQLQuery(queryGetUser_noPW(query, apiName));
    const space_info = await mySQLQuery(queryGetSpaceAndDog(query, apiName));
    logger.debug({
        API: apiName,
        user_info: user_info,
        space_info: space_info,
    });
    
    return plusResult = {
        user_info: user_info[0],
        space_info: space_info,
    }; // 원하는 출력 모양을 추가함
}

/** 유저 정보 수정 - 이름 */
userMng.prototype.setUserName = async (query, apiName) => {
    try {
        logger.debug({
            API: apiName,
            params: query,
        });

        // 유저정보 수정 쿼리문 날리기
        const res = await mySQLQuery(queryChangeUser_info(query, apiName));
        logger.debug({
            'API': apiName,
            '유저정보 수정 결과': res
        });

        if (res.changedRows == 1) return 2000;
        return 1005; // 조회안됨

    } catch (error) {
        logger.error({
            API: apiName,
            error: error
        });
        return 9999;
    }
};

/** JWT 발급(access, refresh token) */
userMng.prototype.signJWT = (userInfo, apiName) => {
    logger.debug({
        API: apiName,
        userInfo: userInfo,
    });

    // 토큰 발급
    if (!userInfo) {
        logger.debug({
            API: apiName,
            userInfo: null,
        });
        return 'login fail';
    } else {
        logger.debug({
            API: apiName,
            userInfo_user_email: userInfo.user_email,
            userInfo_user_id: userInfo.user_id,
            userInfo_user_name: userInfo.user_name,
        });
        try {
            // accessToken 발급
            const accessToken = jwt.sign({
                user_id: userInfo.user_id,
                user_name: userInfo.user_name,
                user_email: userInfo.user_email,
            }, JWT_ACCESS_TOKEN_KEY, {
                expiresIn: '1h',
                issuer : 'About Tech han2',
            });
            // refresh Token 발급
            const refreshToken = jwt.sign({
                user_id: userInfo.user_id,
                user_name: userInfo.user_name,
                user_email: userInfo.user_email,
            }, JWT_REFRESH_TOKEN_KEY, {
                expiresIn: '14d',
                issuer : 'About Tech han2',
            });
            logger.debug({
                API: apiName,
                accessToken: accessToken,
                refreshToken: refreshToken,
            });
            return (result = {
                accessToken,
                refreshToken,
            });
        } catch {}
    }
};

/** SNS 회원탈퇴 (카카오/네이버)
 * 1. DB에서 리프레시토큰 조회
 * 2. 액세스토큰 갱신
 * 3. SNS 회원탈퇴 요청
 * 4. DB에서 유저 삭제
 * 회원탈퇴하면 카카오에서 로그아웃도 같이 진행시킨다.(==토큰만료) 
*/
userMng.prototype.leaveSns = async (query, apiName) => { // 이메일, sns type
    logger.debug({
        API: apiName,
        params: query,
    });
    // DB에서 리프레시토큰 조회하기
    const refresh_token_response = await mySQLQuery(queryGetRefreshToken(query.user_email, apiName));
    const refresh_token = refresh_token_response[0].refresh_token; // 토큰만 추출
    logger.debug({
        API: apiName,
        refresh_token: refresh_token,
    });
    // TODO
    // 카카오인지 네이버인지 구분하기

    // 액세스토큰 갱신하기
    const kakaoAccessToken = await RenewalKakaoToken(refresh_token, apiName); // 카카오에 로그아웃 요청할 때 필요한 액세스토큰 갱신
    logger.debug({
        API: apiName,
        kakaoAccessToken: kakaoAccessToken,
    });

    // 카카오 회원탈퇴 요청
    const {
        data: { id: kakaoId },
    } = await axios('	https://kapi.kakao.com/v1/user/unlink', {
        headers: {
            Authorization: `Bearer ${kakaoAccessToken}`,
        },
    });
    logger.debug({
        API: apiName,
        kakaoId: kakaoId, // 숫자리턴
    });

    // DB에서 리프레시토큰 삭제
    if (kakaoId) {
        const result = await mySQLQuery(await leaveUser(query, apiName));
        logger.debug({
            API: apiName,
            result: result, // 숫자리턴
        });
    }
    return kakaoId;
};

/** SNS 로그아웃 (카카오/네이버)
 * 1. DB에서 리프레시토큰 조회
 * 2. 액세스토큰 갱신
 * 3. SNS 로그아웃 요청
 * 4. DB에서 리프레시토큰 삭제
 */
userMng.prototype.logoutSns = async (query, apiName) => {
    // 이메일, sns type

    // DB에서 리프레시토큰 조회하기
    const refresh_token_response = await mySQLQuery(queryGetRefreshToken(query.user_email, apiName));
    const refresh_token = refresh_token_response[0].refresh_token; // 토큰만 추출
    logger.debug({
        API: apiName,
        refresh_token: refresh_token, 
    });

    // DB에 리프레시토큰도 없다면 리프레시토큰 재발급받기


    // TODO
    // 카카오인지 네이버인지 구분하기

    // 액세스토큰 갱신하기
    const kakaoAccessToken = await RenewalKakaoToken(refresh_token, apiName); // 카카오에 로그아웃 요청할 때 필요한 액세스토큰 갱신
    logger.debug({
        API: apiName,
        kakaoAccessToken: kakaoAccessToken, 
    });

    // 카카오 로그아웃 요청
    const {
        data: { id: kakaoId },
    } = await axios('https://kapi.kakao.com/v1/user/logout', {
        headers: {
            Authorization: `Bearer ${kakaoAccessToken}`,
        },
    });
    logger.debug({
        API: apiName,
        kakaoId: kakaoId, 
    });

    // DB에서 리프레시토큰 삭제
    if (kakaoId) {
        const result = await mySQLQuery(queryChangeRefreshTokenNull(query.user_email, apiName));
        logger.debug({
            API: apiName,
            result: result, 
        });
    }
    return kakaoId;
};

/** SNS 회원가입 (카카오/네이버)
 * 1. 카카오 토큰발급
 * 2. 유저정보조회
 * 4. DB에 회원정보없으면 회원가입하기
 */
userMng.prototype.addSnsUser = async (query, apiName) => {
    // 이메일 중복확인
    // 존재하는 이멜 -> 로그인
    // 존재하지 않는 이멜 -> 회원가입
    
    // 카카오
    if (query.login_sns_type === 'K') {
        result = await joinKakao(query, apiName);

        // 네이버
    } else if (query.login_sns_type === 'N') {
        result = await joinNaver(query, apiName);
    
    } else if (query.login_sns_type === 'G') {
        result = await joinGoogle(query, apiName);

    } else { return 9999; }

    return result;
};

/** 회원탈퇴 (일반, SNS 유저 포함)*/
userMng.prototype.leaveUser = (query, apiName) => { // 논리삭제 (물리삭제X)
    logger.debug({
        API: apiName,
        params: query, 
    });

    // 회원탈퇴 쿼리문 날리기
    return new Promise(async (resolve, reject) => {
        mySQLQuery(await leaveUser(query, apiName)) // 쿼리문 실행 
            .then(async (res) => { 
                logger.debug({
                    API: apiName,
                    res: res, 
                });
                if (res.affectedRows >= 1) return resolve(2000);
                if (res.affectedRows < 1) return resolve(1005); // 테스트이후 수정하기
        })
        .catch((err) => {
            logger.error({
                API: apiName,
                error: err
            });
            return resolve(9999); 
        });
    }); 
}

/** 비밀번호 임시발급
 * 1. 이메일 조회
 * 2. 이메일 전송
 * 3. 비밀번호 변경
 */
userMng.prototype.tempPassword = async (query, apiName) => {
    return new Promise(async (resolve, reject) => {
        const randomCode = await createRandomCode(6); // 6자리
        const emailTitle = '[레인보우 브릿지] 임시 비밀번호 발급';
        const emailContent = `[레인보우 브릿지]에서 임시 비밀번호를 발급해드립니다.
                            \n임시 비밀번호 : ${randomCode}
                            \n
                            \n사이트로 돌아가서 임시 비밀번호로 로그인해주세요.`;
        logger.debug({
            API: apiName,
            randomCode: randomCode, 
        });

        // 이메일 조회
        mySQLQuery(queryGetUser(query, apiName)) // 쿼리문 실행
            .then(async (res) => {
                logger.debug({
                    API: apiName,
                    res_length: res.length, 
                });
                if (res.length == 0) {
                    // DB에 해당 이메일이 없음 -> 실패응답
                    resolve(2009);
                } else {
                    sendResult = await sendEmail(query, emailTitle, emailContent, randomCode); // 이메일 전송
                    result = await queryChangePassword(query, randomCode, apiName); // 비밀번호 변경
                    
                    logger.debug({
                        API: apiName,
                        '이메일 전송 결과': sendResult, 
                        result: result, 
                    });

                    resolve(result); // Promise가 성공 상태로 변경되며 결과를 반환
                }
            })
            .catch((err) => {
                logger.error({
                    API: apiName,
                    error: err
                });
                reject(9999);
            });
    });
};

/** 비밀번호 변경 
 * 1. 현재 비밀번호 일치한다면
 * 2. 바꿀 비밀번호를 저장한다.
*/
userMng.prototype.changePassword = (query, apiName) => { // 현재 pw
    queryChangePassword(query, null, apiName); // randomCode:null
}

/** 이메일 인증
 * 1. 이메일 중복 확인 (수정중)
 * 2. 이메일 전송
 * 3. 인증번호 응답
 */
userMng.prototype.sendEmail = async (query, apiName) => {
    const randomCode = await createRandomCode(6); // 6자리
    const emailTitle = '[레인보우 브릿지] 이메일 인증번호';
    const emailContent = `[레인보우 브릿지]에서 이메일 인증번호 안내드립니다.
                        \n인증번호 : ${randomCode}
                        \n
                        \n사이트로 돌아가서 이메일 인증번호를 입력해주세요.`;
    logger.debug({
        API: apiName,
        randomCode: randomCode, 
    });

    // return new Promise(async (resolve, reject) => {
    //     logger.debug('query :' + query);

    //     // 이메일 조회
    //     logger.debug(`이메일 조회 쿼리문 날리기`)
    //     mySQLQuery(queryGetUser(query)) // 쿼리문 실행
    //         .then(async (res) => {
    //             logger.debug('res length is:' + res.length);
    //             if (res.length == 0) { // DB에 해당 이메일이 없음 -> 회원가입 가능 -> 성공
    //                 logger.debug('return 2000');
    //                 resolve(2000);
    //             } else {
    //                 logger.debug('return 1009');
    //                 resolve(1009); // DB에 해당 이메일 있음 -> 회원가입 불가 -> 실패(중복)
    //             }
    //     })
    //     .catch((err) => {
    //         logger.error(`tempPassword() err: ${err} `)
    //         reject(9999);
    //     });
    // });
    const emailVerificationCode = await sendEmail(query, emailTitle, emailContent, randomCode);
    return emailVerificationCode;
};

/** 일반회원 로그인 */
userMng.prototype.loginUser = (query, apiName) => {
    logger.debug({
        API: apiName,
        params: query, 
    });

    // 비밀번호 복호화
    async function matchHashPassword(pw, pwfromDB) {
        const isMatch = await bcrypt.compare(pw, pwfromDB);
        logger.debug({
            API: apiName,
            pw: pw, 
            pwfromDB: pwfromDB, 
            isMatch: isMatch, 
        });

        return isMatch;
    }

    // 일반회원 로그인 쿼리문 날리기
    return new Promise((resolve, reject) => {
        mySQLQuery(queryGetUser(query, apiName)) // 쿼리문 실행 
            .then(async (res) => { 
                logger.debug({
                    API: apiName,
                    query_user_pw: query.user_pw, 
                });

                isMatch = await matchHashPassword(query.user_pw, res[res.length-1].user_pw); // 임시) 해당이멜로조회된 제일 최신 user를 리턴한다.
                
                logger.debug({
                    API: apiName,
                    'res[0].user_pw': res[res.length - 1].user_pw, 
                    isMatch: isMatch,
                });
                if (isMatch == true) return resolve(selectUserInfo(res[res.length-1])); 
                if (isMatch == false) return resolve(2009); 
            })
            .catch((err) => {
                logger.error({
                    API: apiName,
                    error: err
                });
                return resolve(9999);
            });
    });
};

/** 일반 회원가입 */
userMng.prototype.addUser = (query, apiName) => {
    logger.debug({
        API: apiName,
        params: query, 
    });

    // 회원가입 쿼리문 작성
    async function insertUser(query) {
        user_pw = await toHashPassword(query.user_pw, apiName);

        // 만들 조건문 : sns회원인지 일반회원인지
        // 비번 해싱

        return {
            text: `INSERT INTO USER 
                    (user_email, user_pw, user_state, user_name, login_sns_type, create_at) 
                    VALUES (?, ?, 'N', ?, ?, now())`,
            params: [query.user_email, user_pw, query.user_name, query.login_sns_type],
        };
    }

    // 회원가입 쿼리문 날리기
    return new Promise(async (resolve, reject) => {
        mySQLQuery(await insertUser(query, apiName)) // 쿼리문 실행 / await로 동기화
            .then((res) => {
                return resolve(2000); // USER테이블에 회원가입 완료
            })
            .catch((err) => {
                logger.error({
                    API: apiName,
                    error: err
                });
                return resolve(9999);
            });
    });
};

//ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ

// AccessToken 토큰 갱신


// 회원탈퇴 쿼리문 작성
async function leaveUser(query, apiName) {
    logger.debug({
        API: apiName+' 쿼리문 작성',
        params: query,
        function: 'leaveUser()',
    });

    return {
        text: `DELETE FROM USER
                WHERE user_email = ?`, 
        params: [query.user_email] 
    };
}

// 카카오 토큰 갱신
async function RenewalKakaoToken(refresh_token, apiName) {
    // 카카오 토큰을 받아온다
    const {
        data: {
            access_token: kakaoAccessToken,
            refresh_token: kakaoRefreshToken,
            expires_in: kakaoAccessTokenExpires,
            refresh_token_expires_in: kakaoRefreshTokenExpires,
        },
    } = await axios('https://kauth.kakao.com/oauth/token', {
        params: {
            grant_type: 'refresh_token',
            client_id: KAKAO_REST_API_KEY,
            refresh_token: refresh_token, // 파라미터 변수로 수정하기
            client_secret: KAKAO_CLIENT_SECRET,
        },
    });
    logger.debug({
        API: apiName,
        refresh_token: refresh_token,
        kakaoAccessToken: kakaoAccessToken,
        kakaoRefreshToken: kakaoRefreshToken,
        kakaoAccessTokenExpires: kakaoAccessTokenExpires,  // 리프레시 토큰은 1달 남았을 경우만 갱신됨
        kakaoRefreshTokenExpires: kakaoRefreshTokenExpires,
    });

    // TODO
    // 만약 리프레시토큰이 undefined가 아니라 값을 응답받으면
    // DB에 update해주기

    return kakaoAccessToken;
}

// 구글 회원가입
async function joinGoogle(GoogleUser, apiName) {

    // 구글 회원정보 없으면 DB에 회원추가하기 / 로그인
    // 구글 회원정보 있으면 로그인
    const result = await googleLoginOrRegister(GoogleUser, apiName);
    logger.debug(`result processLoginOrRegister : ${result} `);
    logger.debug({
        API: apiName,
        result: result,
        function: 'processLoginOrRegister()'
    });

    // 응답값
    return new Promise((resolve, reject) => {
        mySQLQuery(queryGetUser_sns(GoogleUser.user_email, apiName)) // 쿼리문 실행
            .then(async (res) => {
                logger.debug({
                    API: apiName,
                    res_length: res.length
                });
                return resolve(selectUserInfo(res[res.length - 1]));
            })
            .catch((err) => {
                logger.error({
                    API: apiName,
                    error: err
                });
                return resolve(9999);
            });
    });
}

// 네이버 토큰발급, 유저정보조회
async function joinNaver(query, apiName) {
    // 네이버 토큰을 받아온다

    const {
        data: { access_token: NaverAccessToken, refresh_token: NaverRefreshToken },
    } = await axios('https://nid.naver.com/oauth2.0/token', {
        params: {
            grant_type: 'authorization_code',
            client_id: NAVER_API_KEY,
            state: 'test',
            code: query.code, // 파라미터 변수로 수정하기
            client_secret: NAVER_SECRET_KEY,
        },
    });
    logger.debug({
        API: apiName,
        query_code: query.code,
        NaverAccessToken: NaverAccessToken,
        NaverRefreshToken: NaverRefreshToken,
    });


    // 네이버 유저 정보를 받아온다
    const { data: NaverUser } = await axios('https://openapi.naver.com/v1/nid/me', {
        headers: {
            Authorization: `Bearer ${NaverAccessToken}`,
        },
    });
    
    logger.debug({
        API: apiName,
        NaverUser: NaverUser,
        id: NaverUser.response.id,
        nickname: NaverUser.response.nickname,
        profile_image: NaverUser.response.profile_image,
        email: NaverUser.response.email,
        name: NaverUser.response.name,
    });

    // 네이버 회원정보없으면 DB에 회원추가하기
    const result = await processLoginOrRegister(NaverUser, NaverRefreshToken, query.login_sns_type, apiName);
    logger.debug(`result processLoginOrRegister : ${result} `);
    logger.debug({
        API: apiName,
        result: result,
        function: 'processLoginOrRegister()'
    });

    // 응답값
    return new Promise((resolve, reject) => {
        mySQLQuery(queryGetUser_sns(NaverUser.response.email, apiName)) // 쿼리문 실행
            .then(async (res) => {
                logger.debug({
                    API: apiName,
                    res_length: res.length
                });
                return resolve(selectUserInfo(res[res.length - 1]));
            })
            .catch((err) => {
                logger.error({
                    API: apiName,
                    error: err
                });
                return resolve(9999);
            });
    });
}

// 카카오 토큰발급, 유저정보조회
async function joinKakao(query, apiName) {
    // 카카오 토큰을 받아온다
    const {
        data: { access_token: kakaoAccessToken, refresh_token: kakaoRefreshToken },
    } = await axios('https://kauth.kakao.com/oauth/token', {
        params: {
            grant_type: 'authorization_code',
            client_id: KAKAO_REST_API_KEY,
            redirect_uri: KAKAO_REDIRECT_URI,
            code: query.code, // 파라미터 변수로 수정하기
            client_secret: KAKAO_CLIENT_SECRET,
        },
    });

    logger.debug({
        API: apiName,
        query_code: query.code,
        kakaoAccessToken: kakaoAccessToken,
        kakaoRefreshToken: kakaoRefreshToken,
    });

    // 카카오 유저 정보를 받아온다
    const kakao = await axios('https://kapi.kakao.com/v2/user/me', {
        headers: {
            Authorization: `Bearer ${kakaoAccessToken}`,
        },
    });

    // 사용할 카카오 유저 정보
    kakaoUser = {
        nickname : kakao.data.properties.nickname,
        profile_image : kakao.data.properties.profile_image,
        email : kakao.data.kakao_account.email,
    }
    
    logger.debug({
        API: apiName,
        kakaoUser
    });

    // 카카오 회원정보없으면 DB에 회원추가하기
    const result = await processLoginOrRegister(kakaoUser, kakaoRefreshToken, query.login_sns_type, apiName);
    logger.debug(`result processLoginOrRegister : ${result} `);
    logger.debug({
        API: apiName,
        result: result,
        function: 'processLoginOrRegister()'
    });

    // 응답값
    return new Promise((resolve, reject) => {
        mySQLQuery(queryGetUser_sns(kakaoUser.email, apiName)) // 쿼리문 실행
            .then(async (res) => {
                logger.debug({
                    API: apiName,
                    res_length: res.length
                });
                return resolve(selectUserInfo(res[res.length - 1]));
            })
            .catch((err) => {
                logger.error({
                    API: apiName,
                    error: err
                });
                return resolve(9999);
            });
    });
}

// 이메일 중복확인 후 DB에 회원정보없으면 회원가입하기
async function googleLoginOrRegister(snsUser, apiName) {
    try {

        const res = await mySQLQuery(await queryGetUser_sns(snsUser.user_email, apiName));
        logger.debug({
            API: apiName,
            rescheck: res,
            res_length: res.length
        });

        if (res.length === 0) {
            await mySQLQuery(await insertSnsUser(snsUser, apiName));
            logger.debug({
                API: apiName,
                if: '0명이라면 회원가입',
                function: 'insertSnsUser()',
            });

        } 
        return res;

    } catch (err) {
        logger.error({
            API: apiName,
            error: err
        });
    }
}

// 이메일 중복확인 후 DB에 회원정보없으면 회원가입하기
async function processLoginOrRegister(snsUser, refresh_token, login_sns_type, apiName) {
    try {

        // 카카오, 네이버 변수
        if (login_sns_type === 'K') {
            email = snsUser.email;
            nickname = snsUser.nickname;
            profile_image = snsUser.profile_image;
        } else {
            email = snsUser.response.email
            nickname = snsUser.response.name // 닉네임대신 이름이로 설정
            profile_image = snsUser.response.profile_image
        }

        // 객체 재정의 (형식 통일시킴)
        snsUser = {
            email: email,
            nickname: nickname,
            profile_image: profile_image,
            refresh_token: refresh_token,
            login_sns_type: login_sns_type
        }

        logger.debug({
            APIthat: apiName,
            snsUser
        });

        const res = await mySQLQuery(await queryGetUser_sns(snsUser.email, apiName));
        logger.debug({
            API: apiName,
            rescheck: res,
            res_length: res.length
        });

        if (res.length === 0) {
            await mySQLQuery(await insertSnsUser(snsUser, login_sns_type, refresh_token, apiName));
            logger.debug({
                API: apiName,
                if: '0명이라면 회원가입',
                function: 'insertSnsUser()',
            });

        } else { // 테스트 후 수정하기
            await mySQLQuery(await updateSnsRefreshToken(snsRefreshToken, snsUser.email, apiName));
            // 로그아웃 이후 리프레시토큰이 없기 때문에 로그인(회원가입X)할 때 리프래시토큰 저장시켜주기
            logger.debug({
                API: apiName,
                if: '1명이라도 있다면 로그인', // 테스트 후 수정하기
                function: 'updateSnsRefreshToken()',
            });
        }
        return res;

    } catch (err) {
        logger.error({
            API: apiName,
            error: err
        });
    }
}

// SNS 회원가입 쿼리문 작성
async function insertSnsUserForGoogle(snsUser, apiName) {
    logger.debug({
        API: apiName+ '쿼리문 작성',
        function: 'insertSnsUser()',
    });
    return {
        text: `INSERT INTO USER 
                (user_email, user_state, user_name, login_sns_type, user_prof_img, refresh_token, create_at) 
                VALUES (?, 'N', ?, ?, ?, ?, now())`,
        params: [
            snsUser.email,
            snsUser.nickname,
            login_sns_type,
            snsUser.profile_image,
            snsUser.refresh_token,
        ],
    };
}

// SNS 회원가입 쿼리문 작성 (카카오, 네이버)
async function insertSnsUser(snsUser, apiName) {
    logger.debug({
        API: apiName+ '쿼리문 작성',
        snsUsercheck: snsUser,
        function: 'insertSnsUser()',
    });
    return {
        text: `INSERT INTO USER 
                (user_email, sns_id, user_state, user_name, user_prof_img, login_sns_type, refresh_token, create_at) 
                VALUES (?, ?, 'N', ?, ?, ?, ?, now())`,
        params: [snsUser.email, snsUser.user_id, snsUser.nickname, snsUser.profile_image, snsUser.login_sns_type, snsUser.refresh_token],
    };
}

// SNS 리프레시토큰발급
async function updateSnsRefreshToken(refresh_token, email, apiName) {
    logger.debug({
        API: apiName+ '쿼리문 작성',
        function: 'updateSnsRefreshToken()',
    });
    return {
        text: `UPDATE USER
                SET refresh_token = ?
                WHERE user_email = ?`, 
        params: [
            refresh_token, email
        ] 
    };
}

// 로그인시 프론트에서 원하는 응답값
function selectUserInfo(user, apiName) {
    logger.debug({
        API: apiName+' 응답값 모양 변형',
        user: user,
        function: 'selectUserInfo()',
    });
    userInfo = { // 원하는 출력 모양을 추가함
        user_id: user.user_id,
        user_name: user.user_name,
        user_prof_img: user.user_prof_img,
        login_sns_type: user.login_sns_type,
        user_email: user.user_email,
    }; 
    logger.debug({
        API: apiName+' 응답값 모양 변형 결과',
        user: userInfo,
        function: 'selectUserInfo()',
    });

    return userInfo
}

// DB에서 refresh토큰값을 비워주는 쿼리문 작성
function queryChangeRefreshTokenNull(email, apiName) {
    logger.debug({
        API: apiName+' 쿼리문 작성',
        email: email,
        function: 'queryChangeRefreshTokenNull()',
        detail: 'DB에서 refresh토큰값을 비워주는 쿼리문',
    });

    return {
        text: `UPDATE USER
                SET refresh_token = NULL
                WHERE user_email = ?; `,
        params: [email],
    };
}

// SNS refresh토큰 조회 쿼리문 작성
function queryGetRefreshToken(email, apiName) {
    logger.debug({
        API: apiName+' 쿼리문 작성',
        email: email,
        function: 'queryGetRefreshToken()',
    });

    return {
        text: `SELECT refresh_token
                FROM USER
                WHERE user_email = ?; `,
        params: [email],
    };
}

// 일반회원 로그인 쿼리문 작성
function queryGetUser(query, apiName) {
    logger.debug({
        API: apiName+' 쿼리문 작성',
        params: query,
        function: 'queryGetUser()',
    });

    return {
        text: `SELECT *
                FROM USER
                WHERE user_email = ?; `, // *로 안 한 이유: pw도 같이 불러와져서
        params: [query.user_email],
    };
}

// sns 간편로그인 쿼리문
function queryGetUser_sns(email, apiName) {
    logger.debug({
        API: apiName+' 쿼리문 작성',
        email: email,
        function: 'queryGetUser_sns()',
    });

    return {
        text: `SELECT *
                FROM USER
                WHERE user_email = ?; `, // *로 안 한 이유: pw도 같이 불러와져서
        params: [email],
    };
}

// 회원정보조회(1):회원정보 쿼리문 작성
function queryGetUser_noPW(query, apiName) {
    logger.debug({
        API: apiName+' 쿼리문 작성',
        params: query,
        function: 'queryGetUser_noPW()',
    });
    return {
        text: `SELECT user_id, user_email, user_state, user_name, user_prof_img, login_sns_type, create_at, update_at, leave_at
                FROM USER
                WHERE user_email = ?; `, // *로 안 한 이유: pw도 같이 불러와져서
        params: [query.user_email],
    };
}

// 마이페이지 유저사진 수정 쿼리문 작성
// Params : user_email, user_prof_img
function queryChangeUser_img(query, url, apiName) {
    return {
        text: `UPDATE USER
                SET user_prof_img = ?
                WHERE user_email = ?`,
        params: [url, query.user_email],
    };
}

// 마이페이지 유저 정보 쿼리문 작성
// Params : user_email, user_name, prof_img
function queryChangeUser_info(query, apiName) {
    return {
        text: `UPDATE USER
        SET user_name = ?
        WHERE user_email = ?`,
        params: [query.user_name, query.user_email],
    };
}

function queryGetMyPageInfo(query, apiName) {
    logger.debug({
        API: apiName+' 쿼리문 작성',
        params: query,
        function: 'queryGetMyPageInfo()',
    });
    return {
        text: `SELECT user_id, user_email, user_state, user_name, user_prof_img, login_sns_type, create_at, update_at, leave_at
        FROM USER
        WHERE user_email = ?; `, // *로 안 한 이유: pw도 같이 불러와져서
        params: [query.user_email],
    };
}

//
function queryCreateRemember(query, apiName) {
    logger.debug({
        API: apiName+' 쿼리문 작성',
        params: query,
        function: 'queryCreateRemember()',
    });
    return {
        text: 'CREATE FROM ',
    };
}

// 회원정보조회(2):반려견,추억공간 정보 쿼리문 작성
function queryGetSpaceAndDog(query, apiName) {
    logger.debug({
        API: apiName+' 쿼리문 작성',
        params: query,
        function: 'queryGetSpaceAndDog()',
        detail: '회원정보조회(2):반려견,추억공간 정보 쿼리문'
    });
    return {
        text: `SELECT
                MS.space_id,
                D.dog_prof_img,
                D.dog_name,
                D.create_at
            FROM MEMORY_SPACE MS
            INNER JOIN DOG D ON MS.dog_id = D.dog_id
            INNER JOIN USER U ON D.user_id = U.user_id
            WHERE U.user_email = ?; `, 
        params: [query.user_email] 
    };
}


// 비밀번호 변경 쿼리문 날리기
function queryChangePassword(query, randomCode, apiName) { // randomCode: 임시비밀번호일 경우 필요한 변수
    return new Promise(async (resolve, reject) => {
        logger.debug({
            API: apiName+'쿼리문 작성',
            params: query
        });

        mySQLQuery(await changePassword(query, randomCode, apiName)) // 쿼리문 실행 
            .then(async (res) => { 
                logger.debug({
                    API: apiName,
                    res_changedRows: res.changedRows,
                });

                if (res.changedRows >= 1) return resolve(2000); // TODO: 테스트이후 ==으로 변경하기
                if (res.changedRows < 1) return resolve(1005);
            })
            .catch((err) => {
                logger.error({
                    API: apiName,
                    error: err
                });
                return resolve(9999);
            });
    });
}

// 일반회원 비밀번호 변경/임시 비밀번호 발급 쿼리문 작성
async function changePassword(query, randomCode, apiName) {
    logger.debug({
        API: apiName+' 쿼리문 작성',
        params: query,
        randomCode: randomCode,
        function: 'changePassword()',
    });

    if (randomCode) { // 임시비밀번호
        user_pw = await toHashPassword(randomCode, apiName); // 랜덤값넣기
        
    } else { // 비밀번호 변경
        user_pw = await toHashPassword(query.user_pw, apiName);
        logger.debug('변경할 비번(랜덤코드)' + query.user_pw);
    }

    logger.debug({
        API: apiName+' 쿼리문 작성',
        user_pw: user_pw,
        detail: '변경할 비번(랜덤코드)',
    });
    
    return {
        text: `UPDATE USER 
                SET user_pw = ?
                WHERE user_email = ?`,
        params: [user_pw, query.user_email],
    };
}

// 이메일 전송
function sendEmail(query, mailTile, mailContent, randomCode, apiName) {
    return new Promise((resolve, reject) => {
        logger.debug({
            API: apiName,
            params: query,
            mailTile: mailTile,
            mailContent: mailContent,
            randomCode: randomCode,
        });

        // nodemailer를 통한 이메일전송 설정
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'rainbowbridge2api@gmail.com',
                pass: 'hnzy ggeb mnuq wknb', // 구글 앱 비밀번호
            },
        });
        var mailOptions = {
            from: 'rainbowbridge2api@gmail.com',
            to: query.user_email,
            subject: mailTile,
            text: mailContent,
        };

        // 실제 전송 메소드
        transporter.sendMail(mailOptions, function (error, info) {
            // 유저 이메일로 인증번호 보내기
            if (error) {
                logger.error({
                    API: apiName,
                    error: error
                });
                resolve(9999);
            } else {
                // 전송 성공시 인증번호 응답하기
                logger.debug({
                    API: apiName,
                    'Email sent': info.response,
                    randomCode: randomCode,
                });

                resolve(randomCode);
            }
        });
    });
}

// 인증번호 생성
function createRandomCode(size, apiName) {
    var randomCode = Math.random().toString(36).substr(2, size); // 난수
    logger.debug({
        API: apiName,
        randomCode: randomCode,
    });
    return randomCode;
}

// 비밀번호 암호화
async function toHashPassword(pw, apiName) {
    const hashedPassword = await bcrypt.hash(pw, 8);
    logger.debug({
        API: apiName,
        pw: pw,
        hashedPassword: hashedPassword,
    });
    return hashedPassword;

    // const isMatch = await bcrypt.compare("helloworld1234", hashedPassword)
    // const isnotMatch = await bcrypt.compare("111helloworld1234", hashedPassword)
}

// 재사용할 쿼리 함수
function mySQLQuery(query) {
    return new Promise(function (resolve, reject) {
        try {
            connection.query(query.text, query.params, function (err, rows, fields) {
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
    });
}

//ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ

/** ACCESS TOKEN 유효성 검증 미들웨어 */
userMng.prototype.authMiddleware = (req, res, next, apiName) => {
    // read the token from header or url
    const token = req.headers['access'];
    
    logger.debug({
        API: apiName+' 미들웨어',
        token: token,
    });
    // token does not exist
    if (!token) {
        return resCode.returnResponseCode(res, 3002, apiName, null, null);
    }

    // create a promise that decodes the token
    const p = new Promise((resolve, reject) => {
        jwt.verify(token, JWT_ACCESS_TOKEN_KEY, (err, decoded) => {
            if (err) reject(err);
            resolve(decoded);
        });
    });

    // if it has failed to verify, it will return an error message
    const onError = (error) => {
        return resCode.returnResponseCode(res, 3009, apiName, null, error.message);
    };

    // process the promise
    p.then((decoded) => {
        req.decoded = decoded;
        next(); // 에러없으면 다음 함수 실행된다.
    }).catch(onError);
};

module.exports = new userMng(); // userMng 모듈 export
