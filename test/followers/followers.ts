import { AxiosError, AxiosResponse } from "axios";
import { axiosInstance, baseUrl, deleteUser, errorHandler, login, logout, myCookies, readFiles, signup, signup2, user, user2, userCredentials, userCredentials2 } from "../setup";
import { GenericResponse, Post, Comment, Follower } from "../../app/utils/globals";
import { expect } from "chai";
import { errorCodes } from "../../app/utils/error";
import path from "path";
import FormData from 'form-data';
import { createDummyPost, createdPost } from "../posts/postsSetup";

let follow1: Partial<Follower>;
let follow2: Partial<Follower>;

function createDummyFollow(follows: string, credentials: any): Promise<void> {
    return createDummyPost()
        .then(() => login(credentials))
        .then(() => followRequest(follows))
        .then((res: AxiosResponse<GenericResponse<Follower>>) => {
            if (follows == user!.id) {
                follow1 = res.data.content;
            } else {
                follow2 = res.data.content;
            }
        })
        .then(() => logout())
        .then(() => { });
}

function getSingleFollow(follows: string, followedBy: string): Promise<AxiosResponse> {

    const myURL = new URL('/follow', baseUrl);
    myURL.searchParams.append('follows', follows);
    myURL.searchParams.append('followedBy', followedBy);

    return axiosInstance.get(myURL.href);
}

function getAllFollowers(follows: string): Promise<AxiosResponse> {

    const myURL = new URL('/follow', baseUrl);
    myURL.searchParams.append('follows', follows);

    return axiosInstance.get(myURL.href);
}


function getAllFollowing(followedBy: string): Promise<AxiosResponse> {

    const myURL = new URL('/follow', baseUrl);
    myURL.searchParams.append('followedBy', followedBy);

    return axiosInstance.get(myURL.href);
}

function followRequest(id: string): Promise<AxiosResponse> {
    return axiosInstance.post('https://localhost:8080/follow', { follows: id }, { headers: { cookie: myCookies } });
}

function acceptRequest(id: string): Promise<AxiosResponse> {
    return axiosInstance.patch('https://localhost:8080/follow', { follows: id, accepted: true }, { headers: { cookie: myCookies } });
}

function rejectRequest(id: string): Promise<AxiosResponse> {
    const myURL = new URL('/follow' + '/' + id, baseUrl);
    return axiosInstance.delete(myURL.href, { headers: { cookie: myCookies } });
}

function loginWrapper(): Promise<AxiosResponse> {
    return login(userCredentials);
}

function followersSetup() {
    return signup()
        .then(() => signup2())
        .then(() => createDummyFollow(user2!.id!, userCredentials))
        .then(() => createDummyFollow(user!.id!, userCredentials2));
}

function followersCleanup() {
    return userCleanUp()
        .then(() => userCleanUp2());
}

function userCleanUp() {
    return login(userCredentials)
        .then(() => deleteUser());
}

function userCleanUp2() {
    return login(userCredentials2)
        .then(() => deleteUser());
}

function wrongUserCleanup() {
    return userCleanUp()
        .then(() => userCleanUp2());
}

describe('Follower tests', function () {

    before(followersSetup);
    after(followersCleanup);

    describe('Follower tests logged out', function () {

        before(logout);

        describe('#Logged out (needs authentication)', function () {
            context('Follow request', function () {
                it('Should be FAIL', async () => {
                    return followRequest("id")
                        .catch((error: AxiosError<GenericResponse<Follower>>) => errorHandler(error, 403, errorCodes.notLoggedIn));
                });
            });

            context('Accept request', function () {
                it('Should be FAIL', async () => {
                    return acceptRequest("id")
                        .catch((error: AxiosError<GenericResponse<Follower>>) => errorHandler(error, 403, errorCodes.notLoggedIn));
                });
            });

            context('Reject request', function () {
                it('Should be FAIL', async () => {
                    return rejectRequest("id")
                        .catch((error: AxiosError<GenericResponse<Follower>>) => errorHandler(error, 403, errorCodes.notLoggedIn));
                });
            });
        });

        describe('#Logged out (does not need authentication)', function () {

            context('Get single follow', function () {
                it('Should be SUCCESS', async () => {
                    const response: AxiosResponse<GenericResponse<Follower>> = await getSingleFollow(user!.id!, user2!.id!);
                    expect(response.status).to.equal(200);
                    expect(response.data).to.have.property('content');
                    const id: string = response.data.content.follows;
                    expect(id).to.be.a('string');
                    expect(id).to.equal(user!.id!);
                });
            });

            context('Get all followers', function () {
                it('Should be SUCCESS', async () => {
                    const response: AxiosResponse<GenericResponse<Follower[]>> = await getAllFollowers(user!.id!);
                    expect(response.status).to.equal(200);
                    expect(response.data).to.have.property('content');
                    const followers: Follower[] = response.data.content;
                    expect(followers).to.be.an('array');
                });
            });

            context('Get all following', function () {
                it('Should be SUCCESS', async () => {
                    const response: AxiosResponse<GenericResponse<Follower[]>> = await getAllFollowing(user!.id!);
                    expect(response.status).to.equal(200);
                    expect(response.data).to.have.property('content');
                    const following: Follower[] = response.data.content;
                    expect(following).to.be.an('array');
                    // console.log(posts);
                });
            });
        });
    });

    describe('Follower tests logged in', function () {
        before(loginWrapper);

        context('Accept request', function () {
            it('Should be SUCCESS', async () => {
                const response: AxiosResponse<GenericResponse<Follower>> = await acceptRequest(user2!.id!);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('content');
                const following: Follower = response.data.content;
                expect(following.accepted).to.be.equal(true);
            });
        });

        context('Reject request', function () {
            it('Should be SUCCESS', async () => {
                const response: AxiosResponse<GenericResponse<Follower>> = await acceptRequest(user2!.id!);
                expect(response.status).to.equal(200);
            });
        });

    });
});
