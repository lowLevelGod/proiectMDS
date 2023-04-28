import { AxiosError, AxiosResponse } from 'axios';
import { GenericResponse } from '../app/utils/globals';
import { expect } from 'chai';
import { UserInfo, axiosInstance, badCredentials, userCredentials, myCookies, signup, login, logout, deleteUser } from './setup';

function whoami(): Promise<AxiosResponse> {
    return axiosInstance.get('https://localhost:8080/whoami', { headers: { cookie: myCookies } });
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