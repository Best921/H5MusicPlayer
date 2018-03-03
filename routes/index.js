var express = require('express');
var router = express.Router();
var path = require('path');//路径处理模块
var fs	= require('fs');//文件处理模块
var media = path.join(__dirname,"../public/media");
/* GET home page. */
router.get('/', function(req, res, next) {
	fs.readdir(media,function(err,names){
		if(err){
			console.log(err);
		}else{
			res.render('index', { title: '921 Music Player',music: names});
		}
	});
  
});

module.exports = router;
