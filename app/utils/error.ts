export const errorCodes = Object.freeze({
    other: 1,
    emailTaken: 2,
    notLoggedIn: 3,
    failedToUpload: 4,
    unAuthorized: 5,
    notFound: 6,
    noContent: 7,
});

export interface Error {
    errorCode: number,
    errorMsg: string,
}

export function craftError(errorCode: number, errorMsg: string): Error {
    return {
        errorCode,
        errorMsg,
    };
}