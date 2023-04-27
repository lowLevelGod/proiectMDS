import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { SessionData } from 'express-session';
import https from 'https';
import { GenericResponse } from '../app/utils/globals';
import { expect } from 'chai';

// At request level
const agent = new https.Agent({
    rejectUnauthorized: false
});

const options = {
    httpsAgent: agent,
    withCredentials: true,
};

function createAxios(): AxiosInstance {
    return axios.create(options);
}

const axiosInstance: AxiosInstance = createAxios();

export interface UserInfo {
    id: string,
    email: string,
    username: string,
};

const userCredentials = {
    password: 'My Secret Password',
    email: 'test2@email.com',
};

const badCredentials = {
    password: 'wrong',
    email: 'test2@email.com',
};

let myCookies: string[] | undefined;


function signup(): Promise<AxiosResponse> {
    return axiosInstance.post('https://localhost:8080/signup', new URLSearchParams(userCredentials))
        .then((response: AxiosResponse<GenericResponse<UserInfo>>) => {
            myCookies = response.headers['set-cookie']!;
            return response;
        });
}

function whoami(): Promise<AxiosResponse> {
    return axiosInstance.get('https://localhost:8080/whoami', { headers: { cookie: myCookies } });
}

function logout(): Promise<AxiosResponse> {
    return axiosInstance.get('https://localhost:8080/logout', { headers: { cookie: myCookies } })
        .then(response => {
            myCookies = undefined;
            return response;
        });
}

function login(credentials: any): Promise<AxiosResponse> {
    return axiosInstance.post('https://localhost:8080/login', new URLSearchParams(credentials))
        .then((response: AxiosResponse<GenericResponse<UserInfo>>) => {
            myCookies = response.headers['set-cookie']!;
            return response;
        });
}

function deleteUser(): Promise<AxiosResponse> {
    return axiosInstance.delete('https://localhost:8080/users/delete', { headers: { cookie: myCookies } });
}

describe('#Sign up', function () {

    context('First time', function () {
        it('Should be SUCCESS', async () => {

            const response: AxiosResponse<GenericResponse<UserInfo>> = await signup();
            expect(response.status).to.equal(200);
            expect(response.data).to.have.property('content');
            const email: string = response.data.content.email;
            expect(email).to.be.a('string');
            expect(email).to.equal(userCredentials.email);
        })
    });

    context('User already exists', function () {
        it('Should be FAIL', async () => {
            return signup()
                .catch((error: AxiosError<GenericResponse<UserInfo>>) => {
                    // {
                    //     "error": {
                    //         "errorCode": 2,
                    //         "errorMsg": "Email is already taken!"
                    //     }
                    // }
                    expect(error.response?.status).to.equal(409);
                    expect(error.response).to.not.be.undefined;
                    expect(error.response!.data).to.have.property('error');
                    const errCode: number = error.response!.data.error.errorCode
                    expect(errCode).to.be.an('number');
                    expect(errCode).to.equal(2);
                });
        });
    });
});

describe('#Who am I', function () {

    context('After sign up', function () {
        it('Should be SUCCESS', async () => {
            const response: AxiosResponse<GenericResponse<UserInfo>> = await whoami();
            expect(response.status).to.equal(200);
            expect(response.data).to.have.property('content');
            const email: string = response.data.content.email;
            expect(email).to.be.a('string');
            expect(email).to.equal(userCredentials.email);
        })
    });
});

describe('#Log out', function () {

    context('First log out', function () {
        it('Should be SUCCESS', async () => {
            const response: AxiosResponse<GenericResponse<UserInfo>> = await logout();
            expect(response.status).to.equal(200);
        })
    });
});

describe('#Who am I', function () {

    context('Not logged in', function () {
        it('Should be FAIL', async () => {
            return whoami()
                .catch((error: AxiosError<GenericResponse<UserInfo>>) => {
                    // {
                    //     "error": {
                    //         "errorCode": 3,
                    //         "errorMsg": "Please log in first!"
                    //     }
                    // }
                    expect(error.response?.status).to.equal(403);
                    expect(error.response).to.not.be.undefined;
                    expect(error.response!.data).to.have.property('error');
                    const errCode: number = error.response!.data.error.errorCode
                    expect(errCode).to.be.an('number');
                    expect(errCode).to.equal(3);
                });
        })
    });
});

describe('#Log in', function () {

    context('Email or password wrong', function () {
        it('Should be FAIL', async () => {
            return login(badCredentials)
                .catch((error: AxiosError<GenericResponse<UserInfo>>) => {
                    // {
                    //     "error": {
                    //         "errorCode": 9,
                    //         "errorMsg": "Email or password wrong!"
                    //     }
                    // }
                    expect(error.response?.status).to.equal(403);
                    expect(error.response).to.not.be.undefined;
                    expect(error.response!.data).to.have.property('error');
                    const errCode: number = error.response!.data.error.errorCode
                    expect(errCode).to.be.an('number');
                    expect(errCode).to.equal(9);
                });
        })
    });

    context('Good credentials', function () {
        it('Should be SUCCESS', async () => {
            const response: AxiosResponse<GenericResponse<UserInfo>> = await login(userCredentials);
            expect(response.status).to.equal(200);
            expect(response.data).to.have.property('content');
            const email: string = response.data.content.email;
            expect(email).to.be.a('string');
            expect(email).to.equal(userCredentials.email);
        })
    });
});

describe('#Delete user', function () {

    context('After creation', function () {
        it('Should be SUCCESS', async () => {
            const response: AxiosResponse<GenericResponse<UserInfo>> = await deleteUser();
            expect(response.status).to.equal(200);
        })
    });

    context('After deletion', function () {
        it('Should be FAIL', async () => {
            return deleteUser()
                .catch((error: AxiosError<GenericResponse<UserInfo>>) => {
                    // {
                    //     "error": {
                    //         "errorCode": 3,
                    //         "errorMsg": "Please log in first!"
                    //     }
                    // }
                    expect(error.response?.status).to.equal(403);
                    expect(error.response).to.not.be.undefined;
                    expect(error.response!.data).to.have.property('error');
                    const errCode: number = error.response!.data.error.errorCode;
                    expect(errCode).to.be.an('number');
                    expect(errCode).to.equal(3);
                });
        })
    });
});