//mysql 연동
const mysql = require('mysql');
require("dotenv").config();
const { DB_HOSTNAME, DB_USERNAME, DB_PASSWORD, DB_DATABASE, DB_PORT} = process.env;
console.log("DB_HOSTNAME: "+DB_HOSTNAME);

config = {
  host: DB_HOSTNAME,
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  port: DB_PORT, 
  // connectionLimit : 10,
  // multipleStatements : true,
};


const _mysqlPool = {
  init: function () {
    console.log("mysql 초기화함");
    return mysql.createConnection(config);
    // return mysql.createPool(config);
	},
};



module.exports = _mysqlPool;