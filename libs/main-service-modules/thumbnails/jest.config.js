module.exports = {
    displayName: "main-service-modules-thumbnails",
    preset: "../../../jest.preset.js",
    transform: {
        "^.+\\.[tj]sx?$": "babel-jest",
    },
    moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
    coverageDirectory: "../../../coverage/libs/main-service-modules/thumbnails",
};
