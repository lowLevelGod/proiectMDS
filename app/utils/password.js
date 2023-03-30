"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPassword = exports.isEmailUnique = exports.validateUser = exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const globals_1 = require("./globals");
// for database storage
function hashPassword(password) {
    const saltRounds = 10;
    return bcrypt_1.default
        .hash(password, saltRounds);
}
exports.hashPassword = hashPassword;
function validateUser(password, storedHash) {
    return bcrypt_1.default
        .compare(password, storedHash)
        .then(res => res)
        .catch(err => {
        console.error(err.message);
        return false;
    });
}
exports.validateUser = validateUser;
// cannot have 2 users with same email
function isEmailUnique(email) {
    return globals_1.knexInstance
        .column('email')
        .select()
        .from('Users')
        .where('email', email)
        .then((x) => x.length === 0)
        .catch(err => {
        console.log(err.message);
        return false;
    });
}
exports.isEmailUnique = isEmailUnique;
function getUserPassword(email) {
    return globals_1.knexInstance
        .select('passwordHash')
        .from('Users')
        .where('email', email)
        .then(x => {
        if (x.length === 0)
            return undefined;
        return x[0].passwordHash;
    })
        .catch(err => {
        console.error(err.message);
        return undefined;
    });
}
exports.getUserPassword = getUserPassword;
