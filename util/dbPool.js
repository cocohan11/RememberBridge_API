//mysql 연동
const mysql = require('mysql');

config = {
  host: '43.202.80.70',
  user: 'rb2',
  password: '112113',
  database: 'rb2web',
  port: '3306', 
  connectionLimit : 10,
  multipleStatements : true,
};


const _mysqlPool = {
  init: function () {
    return mysql.createPool(config);
	},
};

module.exports = _mysqlPool;

// 연동 test
// const db = mysql.createConnection({
//   host: '43.202.80.70',
//   user: 'rb2',
//   password: '112113',
//   database: 'TESTDB',
//   port: '3306' 
// });
// db.connect();
// db.query('SELECT * FROM USER', (error, result) => {
//   if (error) return console.log(error, 'check');
//   console.log(result);
// });