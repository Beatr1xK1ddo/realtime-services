/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./apps/test-clients/src/app/teranex-test.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.teranexTestRun = void 0;
const socket_io_client_1 = __webpack_require__("socket.io-client");
const nodeId = 356;
const ip = '127.0.0.1';
const port = 1345;
function teranexTestRun() {
    const manager = new socket_io_client_1.Manager('http://qa.nextologies.com:1987');
    // const manager = new Manager('http://localhost:1987');
    const socket = manager.socket('/teranex');
    socket.on('connect', () => {
        console.log('client subscribed...');
        socket.emit('subscribe', { nodeId, ip, port });
    });
    socket.on('result', (data) => {
        console.log('testing log from "result"');
        console.log(data);
    });
    socket.emit('commands', {
        nodeId,
        ip,
        port,
        commands: ['TERANEX DEVICE\n\n'],
    });
}
exports.teranexTestRun = teranexTestRun;


/***/ }),

/***/ "socket.io-client":
/***/ ((module) => {

module.exports = require("socket.io-client");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
// import { loggerTestRun } from './app/logger-test';
const teranex_test_1 = __webpack_require__("./apps/test-clients/src/app/teranex-test.ts");
// loggerTestRun();
(0, teranex_test_1.teranexTestRun)();

})();

var __webpack_export_target__ = exports;
for(var i in __webpack_exports__) __webpack_export_target__[i] = __webpack_exports__[i];
if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ })()
;
//# sourceMappingURL=main.js.map