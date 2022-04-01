const { merge } = require('webpack-merge');
const { PinoWebpackPlugin } = require('pino-webpack-plugin')

module.exports = (config) => {
    return merge(config, {
        output: {
            filename: '[name].js'
        },
        plugins: [new PinoWebpackPlugin({ transports: ['pino-pretty'] })]
    });
};