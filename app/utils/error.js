"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.craftError = exports.errorCodes = void 0;
exports.errorCodes = Object.freeze({
    other: 1,
    emailTaken: 2,
    notLoggedIn: 3,
    failedToUpload: 4,
    unAuthorized: 5,
    notFound: 6,
});
function craftError(errorCode, errorMsg) {
    return {
        errorCode,
        errorMsg,
    };
}
exports.craftError = craftError;
