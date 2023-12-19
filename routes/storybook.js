/** 스토리북 API */
const express = require('express');
const router = express.Router();
const storybookMngDB = require('../model/storybookMng');
const resCode = require('../util/resCode');
const logger = require('../winston/logger');



/** 스토리북 - 글 편집 저장(책 생성) API */
router.post('/story', async (req, res) => {
    // API 정보
    const apiName = '스토리북 - 글 편집 저장(책 생성) API';
    logger.http({
        API: apiName,
        reqBody: req.body,
        book_content: req.body.book_content,
        plot_content: req.body.plot_content,
    });

    // 파라미터값 누락 확인
    if (!req.body.space_id || !req.body.book_name|| !req.body.book_writer|| !req.body.book_character|| !req.body.book_outline|| !req.body.book_content|| !req.body.plot_content) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }

    // DB
    // const plusResult = await storybookMngDB.changeComment(req.body, apiName);
    // logger.info({
    //     API: apiName,
    //     plusResult: plusResult,
    // });

    // // response
    // if (plusResult != 9999 && plusResult != 1005 && plusResult != undefined) {
    //     return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', plusResult); // 성공시 응답받는 곳
    // } else {
    //     return resCode.returnResponseCode(res, plusResult, apiName, null, null);
    // }
});


module.exports = router;
