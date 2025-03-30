const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HTMLInlineCSSWebpackPlugin = require('html-inline-css-webpack-plugin').default;
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: argv.mode,
    devtool: isProduction ? false : false,
    watchOptions: {
      ignored: ["node_modules/*", "**/*.css", "dist/*"],
      poll: true
    },
    entry: {
      ui: './src/ui.tsx',
      code: './code.ts'
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader']
        },
        {
          test: /\.(png|jpg|gif|webp|svg)$/,
          type: 'asset/inline'
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js']
    },
    output: {
      filename: (pathData) => {
        return pathData.chunk.name === 'code'
          ? 'code.js'
          : '[name].[contenthash].js';
      },
      path: path.resolve(__dirname, 'dist'),
      clean: true
    },
    plugins: [
      new webpack.DefinePlugin({
        global: {}, // Fix missing symbol error when running in developer VM
      }),
      new HtmlWebpackPlugin({
        inject: 'body',
        template: './ui.html',
        filename: 'ui.html',
        chunks: ['ui'],
        cache: false
      }),
      new HtmlInlineScriptPlugin({
        htmlMatchPattern: [/ui.html/],
        scriptMatchPattern: [/.js$/],
      }),
      new MiniCssExtractPlugin({
        filename: 'styles.css', // Outputs styles.css temporarily
      }),
      new HTMLInlineCSSWebpackPlugin({
        styleTagFactory({ style }) {
          return `<style>${style}</style>`;
        },
      })
    ]
  };
}; 