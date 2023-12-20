/** 스토리북 API */
const express = require('express');
const router = express.Router();
const storybookMng = require('../services/storybookMng');
const resCode = require('../util/resCode');
const logger = require('../winston/logger');



/** 스토리북 - 글 편집 저장(책 생성) API */
router.post('/story', async (req, res) => {
    // API 정보
    const apiName = '스토리북 - 글 편집 저장(책 생성) API';
    logger.http({
        API: apiName,
        reqBody: req.body,
        reqBody_book_character: req.body.book_character,
    });

    // 파라미터값 누락 확인
    if (!req.body.space_id || !req.body.book_name|| !req.body.book_writer|| !req.body.book_character|| !req.body.book_outline|| !req.body.book_content|| !req.body.image_prompt) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }

    // service
    const result = await storybookMng.createbook(req.body, apiName);
    logger.info({
        API: apiName,
        result: result,
    });

    // response
    return resCode.returnResponseCode(res, result, apiName, null, null);
});


/** 스토리북 - 이미지URL 저장(1장) API */
router.post('/imageUrl', async (req, res) => {
    // API 정보
    const apiName = '스토리북 - 이미지URL 저장(1장) API';
    logger.http({
        API: apiName,
        reqBody: req.body,
    });

    // 파라미터값 누락 확인
    if (!req.body.book_id || !req.body.img_url|| !req.body.book_page) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }

    // service
    const result = await storybookMng.saveImageUrl(req.body, apiName);
    logger.info({
        API: apiName,
        result: result,
    });

    // response
    return resCode.returnResponseCode(res, result, apiName, null, null);
});


/** 스토리북 - 책장 조회 API */
router.get('/books/:space_id?', async (req, res) => {
    // API 정보
    const apiName = '책장 조회 API';
    logger.http({
        API: apiName,
        reqParams: req.params,
    });

    // 파라미터값 누락 확인
    if (!req.params.space_id) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }

    // DB
    const result = await storybookMng.getAllBooks(req.params, apiName);
    logger.info({
        API: apiName,
        result: result,
    });

    // response
    if (result != 9999 && result != 1005 && result != undefined) {
        return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', result); // 성공시 응답받는 곳
    } else {
        return resCode.returnResponseCode(res, result, apiName, null, null);
    }
});


module.exports = router;
