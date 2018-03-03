//获取组件
function $(s){
	return document.querySelectorAll(s);
}

//柱状图与圆点图切换
var types = $("#type li");
for(var i = 0;i < types.length;i++){
	types[i].onclick = function(){
		for(var j = 0;j < types.length;j++){
			types[j].className = "";
		}
		this.className = "selected";
		draw.type = this.getAttribute("data-type");
	};
}

var musicList = $("#musicList li");
updateMusicList();
//利用ajax异步请求音频文件
//遍历musicList中各个item的点击事件

//更新音乐列表（在上传后）
function updateMusicList(){
	musicList = $("#musicList li");
	for(var i = 0;i < musicList.length;i++){
		musicList[i].onclick = function(){
			for(var j=0;j < musicList.length;j++){
				musicList[j].className = "";
			}
			this.className = "selected";
			if(this.id != "local"){
				load("/media/" + this.title);
			}else{
				load(localMusic[this.title]);
			}
		}
	}
}

var xhr = new XMLHttpRequest();
var ac = new window.AudioContext();

var gainNode = ac.createGain();
gainNode.connect(ac.destination);

//analyserNode-分析音频资源
var analyserNode = ac.createAnalyser();
var size = 64;//音频数据长度
analyserNode.fftsize = size * 2;//确定频域的 FFT (快速傅里叶变换) 的大小
analyserNode.connect(gainNode);

//利用canvas绘制动画-柱状图
var box = $("#box")[0];
var height,width;
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");//获取canvas上下文
box.appendChild(canvas);
var Dots = [];//每个频点对应一个圆
var DotMode = "go";

canvas.onclick = function(){
	if(DotMode == "go"){
		DotMode = "stop";
	}else{
		DotMode = "go";
	}
};

//返回介于n,m之间的随机数
function random(n,m){
	return Math.round(Math.random()*( n - m ) + m);
}

function getDots(){
	Dots = [];//清空之前数据
	for(var i = 0;i < size;i++){
		var x = random(0,width);//x轴坐标
		var y = random(0,height);//y轴坐标
		var color = "rgba("+ random(0,255) + "," + random(0,255) + "," + random(0,255) +",0.5)";
		Dots.push({
			x: x,
			y: y,
			color: color,
			cap: 0,
			dx: random(1,4)//圆点右移随机量
		});
	}
}

//自适应浏览器大小
function resize(){
	//随浏览器大小调节canvas大小
	height = box.clientHeight;//透过浏览器看内容的这个区域高度。
	width = box.clientWidth;//透过浏览器看内容的这个区域宽度。
	canvas.height = height;
	canvas.width = width;
	getDots();//初始化圆点
}

resize();//初始化
window.onresize = resize;//当窗口改变时调用resize();

//绘制柱状图
function draw(arr){
	//清除canvas以前的内容
	ctx.clearRect(0,0,width,height);
	//参数：x轴坐标，y轴坐标，清除的宽度，清除的高度
	var w = width / size;//x轴分区
	if(draw.type == "column"){//绘制柱状图
		var line = ctx.createLinearGradient(0,0,0,height);//构建线性渐变
		//添加渐变色
		line.addColorStop(0,"red");
		line.addColorStop(0.5,"yellow");
		line.addColorStop(1,"green");
		ctx.fillStyle = line;//之后的填充都按此线性渐变
		//一个一个柱形进行绘制
		for(var i = 0;i < size;i++){
			var h = (arr[i] / 256) * height;
			//256-由arr,8位无符号整数值的类型化数组决定的。
			ctx.fillRect(i * w,height - h,w * 0.6,h);//填充第i个柱形
			var capH = w * 0.4;
			ctx.fillRect(i * w,height - (Dots[i].cap + capH),w * 0.6,w * 0.4);//填充第i个帽头
			//参数：x轴坐标，y轴坐标，柱形宽度（留0.4间隙），柱形高度
			Dots[i].cap--;//每次下落1
			if(Dots[i].cap <= 0){
				Dots[i].cap = 0;
			}
			if(h > 0 && Dots[i].cap < h + 40){
				if( h + 40 > height - capH){
					Dots[i].cap = height - capH;
				}else{
					Dots[i].cap = h + 40;
				}			
			}
		}
	}else{//绘制点状图
		//一个一个圆点进行绘制
		for(var i = 0;i < size;i++){
			ctx.beginPath();
			var o = Dots[i];
			var r = (arr[i] / 256) * 50;
			var g = ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,r);//构建渐变圆
			//添加渐变色,从白色到随机色
			g.addColorStop(0,"#fff");
			g.addColorStop(1,o.color);
			ctx.arc(o.x,o.y,r,0,Math.PI*2,true);
			//ctx.strokeStyle = "#fff";
			//ctx.stroke();
			ctx.fillStyle = g;
			ctx.fill();
			if(o.x + o.dx > width){
				o.x = 0;
			}else if(DotMode == "go"){
				o.x = o.x + o.dx;
			}else{
				o.x = o.x + 0;
			}
		}
	}
	
}

draw.type = "column";//默认绘制柱形图

var source = null;//创建全局资源，避免播放冲突
//当连续切换歌曲时，多个xhr可能运行不到source = bufferSource这一步，
//那么判断source!=null就没有意义了。因为source是全局变量，
//连续切换导致运行不到source = bufferSource这一步，导致source为空。所有点击切换的都会播放。

var count = 0;//运用计时器解决连续切换的BUG。

//创建异步请求
function load(url){
	if(url instanceof ArrayBuffer){
		var i = ++count;
		if(source != null){
			source.stop();//停止上一首歌的播放,停止后会自动销毁
		}
		//解析音频资源
		ac.decodeAudioData(url,function(buffer){
			if(i != count){//count是全局变量，一旦在解析时又切歌了，count=i+1;
				return;
			}
			var bufferSource = ac.createBufferSource();//音频容器
			bufferSource.buffer = buffer;
			bufferSource.connect(analyserNode);
			bufferSource.start(0);
			source = bufferSource;
		},function(err){
			console.log(err);
		});
	}
	else{
		var i = ++count;
		if(source != null){
			source.stop();//停止上一首歌的播放,停止后会自动销毁
		}
		xhr.abort();//终止正在进行中的ajax请求
		xhr.open("GET",url);
		xhr.responseType = "arraybuffer";//一段内存中的二进制缓冲区
		xhr.onload = function(){
			if(i != count){//count是全局变量，一旦在加载时又切歌了，count=i+1;
				return;
			}
			//解析xhr请求过来的音频资源
			ac.decodeAudioData(xhr.response,function(buffer){
				if(i != count){//count是全局变量，一旦在解析时又切歌了，count=i+1;
					return;
				}
				var bufferSource = ac.createBufferSource();//音频容器
				bufferSource.buffer = buffer;
				bufferSource.connect(analyserNode);
				bufferSource.start(0);
				source = bufferSource;
			},function(err){
				console.log(err);
			});
		}
		xhr.send();
	}
}

//获取analyserNode分析后的数据
function getAnalyserData(){
	var arr = new Uint8Array(analyserNode.frequencyBinCount);
	//Unit8Array-8位无符号整数值的类型化数组。内容将初始化为0。
	//frequencyBinCount-AnalyserNode接口中fftSize值的一半.该属性通常用于可视化的数据值的数量
	
	var requestAnimationFrame = window.requestAnimationFrame;
	//告诉浏览器您希望执行动画并请求浏览器调用指定的函数在下一次重绘之前更新动画。
	//该方法使用一个回调函数作为参数，这个回调函数会在浏览器重绘之前调用。
	//用它来做连贯的逐帧动画
	
	function v(){
		analyserNode.getByteFrequencyData(arr);
		//获取analyserNode分析后的数据
		draw(arr);//绘制柱状图或点状图
		requestAnimationFrame(v);//循环重绘
	}
	
	requestAnimationFrame(v);
	
}

getAnalyserData();//初始化

//修改音量
function changeVolume(percent){
	gainNode.gain.value = percent;
}
$("#volume")[0].onchange = function(){
	changeVolume(this.value/this.max);
} 
$("#volume")[0].onchange();//初始化

//上传本地音乐
$("#add")[0].onclick = function(){
	$("#upMusic")[0].click();
};

var localMusic = [];//全局变量存储上传的音乐
var num = 0;
$("#upMusic")[0].onchange = function(){
	var file = this.files[0];
	var li = document.createElement("li");
	li.innerHTML = file.name;
	li.title = num++;
	li.id = "local";
	$("#musicList")[0].prepend(li);
	var fr = new FileReader();
	fr.onload = function(e){
		localMusic[li.title] = e.target.result;
		updateMusicList();
	};
	fr.readAsArrayBuffer(file);
};