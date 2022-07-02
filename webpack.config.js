const path = require('path');
const webpack = require('webpack');

const packageRoot = path.dirname(require.main.filename);

module.exports = {
  entry: path.join(__dirname, 'src/app.js'),
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'web'),
  },
  resolve: {
    alias: {
         assert: require.resolve("assert/")
    },
    fallback: { 
        "process": false,
        "path": false,
        "http": false,
        "https": false,
        "crypto": false,
        "fs": false
    }
  },
  plugins: [
    new webpack.EnvironmentPlugin({
        NODE_DEBUG: false
    })
  ]

};
