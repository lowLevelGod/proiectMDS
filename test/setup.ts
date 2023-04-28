import { SessionData } from 'express-session';
import https from 'https';
import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { GenericResponse } from '../app/utils/globals';
import fsp from 'fs/promises';
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

export const axiosInstance: AxiosInstance = createAxios();

export interface UserInfo {
    id: string,
    email: string,
    username: string,
};

export const userCredentials = {
    password: 'My Secret Password',
    email: 'test2@email.com',
};

export const badCredentials = {
    password: 'wrong',
    email: 'test2@email.com',
};

export let user: Partial<UserInfo> | undefined;

export let myCookies: string[] | undefined;

export const baseUrl = 'https://localhost:8080/';

export function login(credentials: any): Promise<AxiosResponse> {
    return axiosInstance.post('https://localhost:8080/login', new URLSearchParams(credentials))
        .then((response: AxiosResponse<GenericResponse<UserInfo>>) => {
            myCookies = response.headers['set-cookie']!;
            user = response.data.content;
            return response;
        });
}

export function logout(): Promise<AxiosResponse> {
    return axiosInstance.get('https://localhost:8080/logout', { headers: { cookie: myCookies } })
        .then(response => {
            myCookies = undefined;
            user = undefined;
            return response;
        });
}

export function signup(): Promise<AxiosResponse> {
    return axiosInstance.post('https://localhost:8080/signup', new URLSearchParams(userCredentials))
        .then((response: AxiosResponse<GenericResponse<UserInfo>>) => {
            myCookies = response.headers['set-cookie']!;
            user = response.data.content;
            return response;
        });
}

export function readFiles(files: string[]): Promise<Buffer[]>{
    const promises: Promise<Buffer>[] = files.map(file => fsp.readFile(file));
    return Promise.all(promises);
}


export function errorHandler(error: AxiosError<GenericResponse<any>>, status: number, code: number){
    expect(error.response?.status).to.equal(status);
    expect(error.response).to.not.be.undefined;
    expect(error.response!.data).to.have.property('error');
    const errCode: number = error.response!.data.error.errorCode
    expect(errCode).to.be.an('number');
    expect(errCode).to.equal(code);
}

export function deleteUser(): Promise<AxiosResponse> {
    return axiosInstance.delete('https://localhost:8080/users/delete', { headers: { cookie: myCookies } });
}

