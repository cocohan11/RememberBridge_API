var createError = require('http-errors');
var express = require('express');
var path = require('path');
var app = express();
const fs = require('fs'); // 파일을 읽어나 쓰는 모듈
const bodyParser = require('body-parser'); // POST요청시 들어오는 BODY를 처리하기 위해 body-parser 설정
const cors = require('cors'); // 서버에서 CORS 허용을 하기 위한 모듈 // 외부 리소스 접근권한을 http헤더에 넣어주기
const cookieParser = require('cookie-parser');


app.use('/util', express.static(path.join(__dirname, 'util'))); //util경로에 있는 파일들을 읽기위한 처리 
app.use(bodyParser.urlencoded({extended:true})); //body-parser 설정 // request 객체의 body에 대한 url encoding의 확장을 할 수 있도록 하는 설정
app.use(bodyParser.json()); //request body에 오는 데이터를 json 형식으로 변환
app.use(cors()); // 전체허용
// app.use(cors({ origin: '1.220.248.206', credentials: true }));
app.use(express.json());
app.use(cookieParser());


// 포트설정
app.listen(3000, function(){
	console.log('Connect 3000 port');
});


// routes 폴더로 라우팅시키기
fs.readdirSync(__dirname + '/routes/').forEach(function (fileName) {
	let routeName = fileName.substr(0, fileName.lastIndexOf('.'));
        let fileFullPath = __dirname + '/routes/' + fileName;

	console.log('fileFullPath :', fileFullPath);
	console.log('/api/ + routeName:', '/api/' + routeName);
	if (fs.statSync(fileFullPath).isFile()) {
		app.use('/api/' + routeName, require(fileFullPath));
	}
});

// html 파일 응답하기
// url : http://43.202.80.70:5000/
console.log('__dirname :', __dirname);
app.use(express.static(path.join(__dirname, '../remember_front/build'))); // 이게 있어야 특정 폴더의 파일들 전송가능
app.get('/', function (요청, 응답) {
  응답.sendFile(path.join(__dirname, '../remember_front/build/index.html'));
});

// 리액트라우터 사용하기 (주의 - 최하단에 두기)
app.get('*', function (요청, 응답) { // *뜻 : 모든 문자
	응답.sendFile(path.join(__dirname, '../remember_front/build/index.html')); // 고객이 URL란에 아무거나 입력하면 리액트 프로젝트 보내주세요-라는 뜻
});

module.exports = app;



