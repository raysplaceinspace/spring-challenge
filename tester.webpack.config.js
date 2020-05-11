const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const testerConfig = {
  entry: './src/tester/index.ts',
  mode: 'development',
  resolve: {
    extensions: [".ts"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
          experimentalWatchApi: true,
        },
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'tester.js'
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin()
  ],
};

module.exports = [ testerConfig ];
