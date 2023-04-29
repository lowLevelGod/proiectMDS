import { AxiosError, AxiosResponse } from "axios";
import { axiosInstance, baseUrl, deleteUser, errorHandler, login, logout, myCookies, readFiles, signup, signup2, user, userCredentials, userCredentials2 } from "./setup";
import { GenericResponse, Post } from "../app/utils/globals";
import { expect } from "chai";
import { errorCodes } from "../app/utils/error";
import path from "path";
import FormData from 'form-data';

const postCreate: Partial<Post> = {
    description: "This post is part of testing",
    picturesURLs: [path.join(__dirname, 'Beluga.png')],
}

function create(data: FormData): Promise<AxiosResponse> {
    let headers = data.getHeaders();
    headers.cookie = myCookies;
    return axiosInstance.post('https://localhost:8080/posts', data, { headers });
}

function deletePost(id: string): Promise<AxiosResponse> {

    const myURL = new URL('/posts' + '/' + id, baseUrl);
    return axiosInstance.delete(myURL.href, { headers: { cookie: myCookies } });
}

function edit(data: Partial<Post>, id: string): Promise<AxiosResponse> {

    const myURL = new URL('/posts' + '/' + id, baseUrl);
    return axiosInstance.patch(myURL.href, data, { headers: { cookie: myCookies } });
}

function getSinglePost(id: string): Promise<AxiosResponse> {

    const myURL = new URL('/posts' + '/' + id, baseUrl);
    return axiosInstance.get(myURL.href);
}

function getPostMedia(id: string): Promise<AxiosResponse> {

    const myURL = new URL('/posts' + '/' + id + '/media', baseUrl);
    return axiosInstance.get(myURL.href);
}

function getPostsByUser(id: string): Promise<AxiosResponse> {

    const myURL = new URL('/posts', baseUrl);
    myURL.searchParams.append('userid', id);
    return axiosInstance.get(myURL.href);
}

function loginWrapper(): Promise<AxiosResponse> {
    return login(userCredentials);
}

let createdPost: Partial<Post>;
function createDummyPost(): Promise<void> {

    let data = new FormData();
    data.append('description', postCreate.description!);

    return login(userCredentials)
        .then(() => readFiles(postCreate.picturesURLs!))
        .then((files: Buffer[]) => {
            files.forEach((elem) => data.append('media', elem, { filename: 'test_photo.png' }))
        })
        .then(() => create(data))
        .then((res: AxiosResponse<GenericResponse<Post>>) => {
            createdPost = res.data.content;
        })
        .then(() => logout())
        .then(() => { });
}

function userCleanUp() {
    return login(userCredentials)
        .then(() => deleteUser());
}

function userCleanUp2() {
    return login(userCredentials2)
        .then(() => deleteUser());
}

function wrongUserSetup() {
    return signup()
        .then(() => createDummyPost())
        .then(() => logout())
        .then(() => signup2());
}

function wrongUserCleanup() {
    return userCleanUp()
        .then(() => userCleanUp2());
}

describe('Post tests', function () {

    before(signup);
    after(userCleanUp);

    describe('Post tests logged out', function () {

        before(logout);

        describe('#Logged out (needs authentication)', function () {
            context('Create post', function () {
                it('Should be FAIL', async () => {
                    return create(new FormData())
                        .catch((error: AxiosError<GenericResponse<Post>>) => errorHandler(error, 403, errorCodes.notLoggedIn));
                });
            });

            context('Delete post', function () {
                it('Should be FAIL', async () => {
                    return deletePost("id")
                        .catch((error: AxiosError<GenericResponse<Post>>) => errorHandler(error, 403, errorCodes.notLoggedIn));
                });
            });

            context('Edit post', function () {
                it('Should be FAIL', async () => {
                    return edit({}, "id")
                        .catch((error: AxiosError<GenericResponse<Post>>) => errorHandler(error, 403, errorCodes.notLoggedIn));
                });
            });
        });

        describe('#Logged out (does not need authentication)', function () {

            before(createDummyPost);

            context('Get single post', function () {
                it('Should be SUCCESS', async () => {
                    const response: AxiosResponse<GenericResponse<Post>> = await getSinglePost(createdPost.id!);
                    expect(response.status).to.equal(200);
                    expect(response.data).to.have.property('content');
                    const id: string = response.data.content.id;
                    expect(id).to.be.a('string');
                    expect(id).to.equal(createdPost.id);
                });
            });

            context('Get post media', function () {
                it('Should be SUCCESS', async () => {
                    const response: AxiosResponse<GenericResponse<Post>> = await getPostMedia(createdPost.id!);
                    expect(response.status).to.equal(200);
                    expect(response.data).to.have.property('content');
                    const urls: string[] = response.data.content.picturesURLs;
                    expect(urls).to.be.an('array');
                });
            });

            context('Get posts by user', function () {
                it('Should be SUCCESS', async () => {
                    const response: AxiosResponse<GenericResponse<Post[]>> = await getPostsByUser(createdPost!.userId!);
                    expect(response.status).to.equal(200);
                    expect(response.data).to.have.property('content');
                    const posts: Post[] = response.data.content;
                    expect(posts).to.be.an('array');
                    // console.log(posts);
                });
            });
        });
    });

    describe('Post tests logged in', function () {
        before(loginWrapper);

        context('Create post', function () {
            it('Should be SUCCESS', async () => {
                let data = new FormData();
                data.append('description', postCreate.description!);

                const promise = readFiles(postCreate.picturesURLs!)
                    .then((files: Buffer[]) => {
                        files.forEach((elem) => data.append('media', elem, { filename: 'test_photo.png' }))
                    })
                    .then(() => create(data));

                const response: AxiosResponse<GenericResponse<Post>> = await promise;
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('content');
                const id: string = response.data.content.id;
                expect(id).to.be.a('string');
            });
        });

        context('Edit post', function () {
            it('Should be SUCCESS', async () => {
                const response: AxiosResponse<GenericResponse<Post>> = await edit({ description: "modified" }, createdPost.id!);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('content');
                const id: string = response.data.content.id;
                expect(id).to.be.a('string');
                expect(id).to.equal(createdPost.id);
                expect(response.data.content.description).to.equal("modified");
            });
        });

        context('Delete post', function () {
            it('Should be SUCCESS', async () => {
                const response: AxiosResponse<GenericResponse<Post>> = await deletePost(createdPost.id!);
                expect(response.status).to.equal(200);
            });
        });
    });
});

describe('Post tests logged in with wrong user', function () {
    before(wrongUserSetup);
    after(wrongUserCleanup);

    context('Edit post', function () {
        it('Should be FAIL', async () => {
            return edit({ description: "modified" }, createdPost.id!)
                .catch((error: AxiosError<GenericResponse<Post>>) => errorHandler(error, 403, errorCodes.unAuthorized));
        });
    });

    context('Delete post', function () {
        it('Should be FAIL', async () => {
            return deletePost(createdPost.id!)
                .catch((error: AxiosError<GenericResponse<Post>>) => errorHandler(error, 403, errorCodes.unAuthorized));
        });
    });
});

