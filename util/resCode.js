const logger = require("../winston/logger");
function resCode() {}
/**
 * 에러코드로 응답을 받기 
 * 파라미터로 에러코드 넣으면 바로 json출력해주기
 */
resCode.prototype.returnResponseCode = (res, value, apiName, addField, subMessage) => { // subMessage:특별히 출력한 메세지가있는경우 기입, 없으면 null
    switch (value) {
      
      case 2000:
        message = apiName + ' 성공' // ex) 3D 모델 재성성 성공
        logger.debug(`returnResponseCode 2000`);
        const result_success = {
          code: '2000',
          message: message
        };
        if (addField == 'addToResult') {
          // 속성으로 감싸지않고 기존result에 row추가해주기
          for (let key in subMessage) { // list에서 key에 해당하는 이름과 이름의 속성 값을 result에 추가
            result_success[key] = subMessage[key];
          }
        }
        if (addField == 'arraylist') {
          res.status(200).json({
            result: subMessage
          });
          break;
        }
        logger.http(`${JSON.stringify(result_success, null, 2)}`);
        res.status(200).json({
          result: result_success
        });
        break;
      
      case 2009 :
        if (subMessage) {
          message = subMessage
        } else {
          message = apiName + ' 실패'
        }
        let result_fail = {
          code: '2009',
          message: message
        };
        logger.http(`최종응답값 : \n${JSON.stringify(result_fail, null, 2)}`);
        res.status(200).json({
          result: result_fail
        })
        break;
      
      case 1009 :
        if (subMessage) {
          message = subMessage
        } else {
          message = apiName + ' 중복'
        }
        let result_duplication = {
          code: '1009',
          message: message
        };
        logger.http(`최종응답값 : \n${JSON.stringify(result_duplication, null, 2)}`);
        res.status(200).json({
          result: result_duplication
        })
        break;
    
      case 1002 :
        if (subMessage) {
          message = subMessage
        } else {
          message = '필수파라미터가 누락되어있습니다!'
        }
        let result_empty = {
          code: '1002',
          message: message
        };
        logger.http(`최종응답값 : \n${JSON.stringify(result_empty, null, 2)}`);
        res.status(401).json({
          result: result_empty
        })
        break;
    
      case 1005 :
        if (subMessage) {
          message = subMessage
        } else {
          message = '해당되는 정보를 조회할 수 없습니다!' 
        }
        let result_notExist = {
          code: '1005',
          message: message
        };
        logger.http(`최종응답값 : \n${JSON.stringify(result_notExist, null, 2)}`);
        res.status(200).json({
          result: result_notExist
        })
        break;
      
      case 3002 :
        if (subMessage) {
          message = subMessage
        } else {
          message = '토큰이 누락되어있습니다!'
        }
        let result_token_empty = {
          code: '3002',
          message: message
        };
        logger.http(`최종응답값 : \n${JSON.stringify(result_token_empty, null, 2)}`);
        res.status(403).json({ // http 상태값 403 : 권한거부
          result: result_token_empty
        })
        break;
      
      case 3009 :
        if (subMessage) {
          message = subMessage
        } else {
          message = apiName+' 실패 (토큰에러)'
        }
        let result_token_error = {
          code: '3009',
          message: message
        };
        logger.http(`최종응답값 : \n${JSON.stringify(result_token_error, null, 2)}`);
        res.status(403).json({ // http 상태값 403 : 권한거부
          result: result_token_error
        })
        break;
      
      default:
        if (subMessage) {
          message = subMessage
        } else {
          message = apiName+' 실패 또는 에러' // ex) 3D 모델 재성성 실패
        }
        let result_failOrError = {
          code: '9999',
          message: message
        };
        logger.http(`최종응답값 : \n${JSON.stringify(result_failOrError, null, 2)}`);
        res.status(500).json({
          result: result_failOrError
        }) 
        break;
    }
}
  

module.exports = new resCode(); //resCode 모듈 export 