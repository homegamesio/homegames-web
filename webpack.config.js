const path = require('path');

module.exports = [
    {
        entry: './src/app.js',
        output: {
            filename: 'bundle.js',
            path: path.resolve(__dirname, 'web'),
        }
    },
    {
        entry: './src/worker.js',
        output: {
            filename: 'worker.js',
            path: path.resolve(__dirname, 'web'),
        },
    }
];
