/** 스토리북 API */
const express = require('express');
const router = express.Router();
const storybookMng = require('../services/storybookMng');
const resCode = require('../util/resCode');
const logger = require('../winston/logger');


/** 책제목 수정 API */
router.post('/title/change', async (req, res) => {
    // API 정보
    const apiName = '책제목 수정 API';
    logger.http({
        API: apiName,
        reqBody: req.body,
    });

    // 파라미터값 누락 확인
    if (!req.body.book_id || !req.body.space_id|| !req.body.book_name) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }

    // service
    const result = await storybookMng.editTitle(req.body, apiName);
    logger.info({
        API: apiName,
        result: result,
    });

    // response
    return resCode.returnResponseCode(res, result, apiName, null, null);
});


/** 스토리 개별 수정 API */
router.post('/story/change/each', async (req, res) => {
    // API 정보
    const apiName = '스토리 개별 수정 API';
    logger.http({
        API: apiName,
        reqBody: req.body,
    });

    // 파라미터값 누락 확인
    if (!req.body.book_id || !req.body.story_id|| !req.body.book_content) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }

    // service
    const result = await storybookMng.editStory(req.body, apiName);
    logger.info({
        API: apiName,
        result: result,
    });

    // response
    return resCode.returnResponseCode(res, result, apiName, null, null);
});


/** 이미지 URL 개별 수정 API */
router.post('/imageUrl/change', async (req, res) => {
    // API 정보
    const apiName = '이미지 URL 개별 API';
    logger.http({
        API: apiName,
        reqBody: req.body,
    });

    // 파라미터값 누락 확인
    if (!req.body.book_id || !req.body.img_id|| !req.body.img_url) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }

    // service
    const result = await storybookMng.editImageUrl(req.body, apiName);
    logger.info({
        API: apiName,
        result: result,
    });

    plusResult = { img_url: req.body.img_url }
    // response
    return resCode.returnResponseCode(res, result, apiName, 'addToResult', plusResult);
});


/** 글 편집 수정 API */
router.post('/story/change', async (req, res) => {
    // API 정보
    const apiName = '글 편집 수정 API';
    logger.http({
        API: apiName,
        reqBody: req.body,
    });

    // 파라미터값 누락 확인
    if (!req.body.book_id || !req.body.book_name|| !req.body.book_outline|| !req.body.book_content|| !req.body.image_prompt) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }

    // service
    const result = await storybookMng.editBook(req.body, apiName);
    logger.info({
        API: apiName,
        result: result,
    });

    // response
    return resCode.returnResponseCode(res, result, apiName, null, null);
});


/** 이미지 편집화면 조회 API */
router.get('/imageUrl/:book_id?', async (req, res) => {
    // API 정보
    const apiName = '이미지 편집화면 조회 API';
    logger.http({
        API: apiName,
        reqParams: req.params,
    });

    // 파라미터값 누락 확인
    if (!req.params.book_id) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }

    // DB
    const result = await storybookMng.getAllImages(req.params, apiName);
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


/** 글편집 조회 API */
router.get('/story/:book_id?', async (req, res) => {
    // API 정보
    const apiName = '글편집 조회 API';
    logger.http({
        API: apiName,
        reqParams: req.params,
    });

    // 파라미터값 누락 확인
    if (!req.params.book_id) {
        return resCode.returnResponseCode(res, 1002, apiName, null, null);
    }

    // DB
    const result = await storybookMng.getAllStories(req.params, apiName);
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


/** 글 편집 저장(책 생성) API */
router.post('/story', async (req, res) => {
    // API 정보
    const apiName = '글 편집 저장(책 생성) API';
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
    if (result != 9999 && result != 1005 && result != undefined) {
        return resCode.returnResponseCode(res, 2000, apiName, 'addToResult', result); // 성공시 응답받는 곳
    } else {
        return resCode.returnResponseCode(res, result, apiName, null, null);
    }
});


/** 이미지URL 저장(1장) API */
router.post('/imageUrl', async (req, res) => {
    // API 정보
    const apiName = '이미지URL 저장(1장) API';
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

    plusResult = { img_url: req.body.img_url }
    // response
    return resCode.returnResponseCode(res, result, apiName, 'addToResult', plusResult);
});


/** 책장 조회 API */
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
