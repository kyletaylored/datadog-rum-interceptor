module.exports = {
    // By default, run in a Node test environment
    testEnvironment: 'node',

    // Tell Jest to transpile files with babel-jest
    transform: {
        '^.+\\.[tj]sx?$': 'babel-jest'
    }
}
