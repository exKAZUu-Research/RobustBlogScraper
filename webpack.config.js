const path = require('path');
const fs = require('fs');
const MinifyPlugin = require('babel-minify-webpack-plugin');

const nodeModules = {};
fs
  .readdirSync('node_modules')
  .filter(name => {
    return name !== '.bin';
  })
  .forEach(mod => {
    nodeModules[mod] = 'commonjs ' + mod;
  });

module.exports = function(env) {
  return {
    entry: {
      cli: './src/cli/BlogMain.ts',
      server: './src/server/Main.ts',
    },
    target: 'node',
    node: {
      __dirname: true,
    },
    output: {
      path: path.join(__dirname, 'build'),
      filename: '[name].js',
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    plugins: env && env.removeConsole === 'true' ? [new MinifyPlugin({ removeConsole: true })] : [],
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    externals: nodeModules,
  };
};
