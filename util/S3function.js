const logger = require("../winston/logger");
function S3function() {}


// S3 파일존재유무 조회
S3function.prototype.checkfileExists = async (s3, bucketPathList, bucketPathList_exist, apiName) => { // subMessage:특별히 출력한 메세지가있는경우 기입, 없으면 null
    logger.debug({
      API: apiName,
      bucketPathList: bucketPathList,
      detail: "파일명으로 S3에 사진있는지 조회하기",
      function: "checkfileExists()",
    });
  
    const promises = [];
  
    for (const value of bucketPathList) {
      if (value != null) {
        promises.push(
          new Promise(async (resolve, reject) => {
            try {
              const exists_data = await s3.headObject(value).promise();
              logger.debug({
                API: apiName,
                detail: `File ${value.Key} exists. checking...and list push`,
                function: "checkfileExists()",
              });
  
              bucketPathList_exist.push(value);
              logger.debug({
                API: apiName,
                bucketPathList_exist: bucketPathList_exist,
                function: "checkfileExists()",
              });
  
              resolve(exists_data);
            } catch (err) {
              logger.debug(`File ${value.Key} does not exist.`);
              logger.error({
                API: apiName,
                err: err,
                detail: `File ${value.Key} does not exist.`,
                function: "checkfileExists()",
              });
              resolve(1005);
            }
          })
        );
      }
    }
  
    try {
      logger.debug({
        API: apiName,
        promises_length: promises.length,
        detail: `promises 안에 담겨져서 존재하는지 조회할 파일 갯수: ${promises.length}`,
        function: "checkfileExists()",
      });
  
      const res = await Promise.all(promises);
      logger.debug({
        API: apiName,
        res: res,
        detail: `All files exist. Deleting...`,
        function: "checkfileExists()",
      });
      return 2000;
    } catch (err) {
      logger.error({
        API: apiName,
        err: err,
        detail: "File does not exist. Cannot delete.",
        function: "checkfileExists()",
      });
      return 1005;
    }
}



// S3 파일삭제 함수
S3function.prototype.removeDiaryPhotosFromS3 = async (s3, bucketPathList, apiName) => { 
  logger.debug({
    API: apiName,
    bucketPathList: bucketPathList,
    bucketPathList_length: bucketPathList.length,
    detail: "deleteFiles() 삭제할 파일 갯수",
    function: "removeDiaryPhotosFromS3()",
  });

  try {
    const deletePromises = bucketPathList.map((value, index) => {
      return s3
        .deleteObjects(pramsForDeleteObjects(bucketPathList, index))
        .promise();
    });

    await Promise.all(deletePromises); // 모든 삭제 작업을 병렬로 처리
    logger.debug({
      API: apiName,
      detail: "File deleted successfully.", // 조회O 삭제O
      function: "removeDiaryPhotosFromS3()",
    });

    return 2000;
  } catch (err) {
    logger.error({
      API: apiName,
      error: err.stack,
      detail: "deleteFiles() 에러",
    });
    return 9999;
  }
}


// S3 파일삭제 요청양식
function pramsForDeleteObjects(bucketPathList_exist, idx, apiName) {
  return (params = {
    Bucket: bucketPathList_exist[idx].Bucket,
    Delete: {
      Objects: [
        {
          Key: bucketPathList_exist[idx].Key,
        },
      ],
      Quiet: false, // (참고) Delete API 요청에 대한 응답에 삭제 작업의 성공/실패 여부와 관련된 정보
    },
  });
}

module.exports = new S3function(); //S3function 모듈 export 
