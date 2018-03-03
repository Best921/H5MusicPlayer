var webpack = require('webpack');
var path = require('path');
//路径是相对于package.json所在路径



module.exports = {
    entry: { //配置入口文件，有几个写几个
        index: './bin/www'
    },
    output: { 
        path: path.join(__dirname, './public/dist/'), //输出目录的配置，模板、样式、脚本、图片等资源的路径配置都相对于它
        publicPath: '/dist/',               //模板、样式、脚本、图片等资源对应的server上的路径
        filename: '[name].js',           //每个页面对应的主js的生成配置
    },
    module: {
        rules: [
          {
            test: /\.js[x]?$/,
            exclude: /(node_modules)|(global\/lib\/)/,
            loader: 'babel-loader'
          },
          {
            test: /\.css$/,
            loader: 'style-loader!css-loader'
          }
        ]
    },
    node: {
        fs: "empty",
        net: "empty"
    }
};