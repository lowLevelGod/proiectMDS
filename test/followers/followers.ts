import { AxiosError, AxiosResponse } from "axios";
import { axiosInstance, baseUrl, deleteUser, errorHandler, login, logout, myCookies, readFiles, signup, signup2, user, userCredentials, userCredentials2 } from "../setup";
import { GenericResponse, Post, Comment } from "../../app/utils/globals";
import { expect } from "chai";
import { errorCodes } from "../../app/utils/error";
import path from "path";
import FormData from 'form-data';
import { createDummyPost, createdPost } from "../posts/postsSetup";

let commentCreateParent: Partial<Comment>;
let commentCreateChild: Partial<Comment>;

function createDummyComment(parent: string | undefined, credentials: any): Promise<void> {
    return createDummyPost()
        .then(() => login(credentials))
        .then(() => create({
            postId: createdPost.id!,
            content: "Comment with parent " + parent || "null",
            parentId: parent,
        }))
        .then((res: AxiosResponse<GenericResponse<Comment>>) => {
            if (parent) {
                commentCreateChild = res.data.content;
            } else {
                commentCreateParent = res.data.content;
            }
        })
        .then(() => logout())
        .then(() => { });
}

function create(data: Partial<Comment>): Promise<AxiosResponse> {
    return axiosInstance.post('https://localhost:8080/comments', data, { headers: { cookie: myCookies } });
}

function edit(data: Partial<Comment>, id: string): Promise<AxiosResponse> {

    const myURL = new URL('/comments' + '/' + id, baseUrl);
    return axiosInstance.patch(myURL.href, data, { headers: { cookie: myCookies } });
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
    return axiosInstance.post('https://localhost:8080/follow', { userId: id }, { headers: { cookie: myCookies } });
}

function acceptRequest(id: string): Promise<AxiosResponse> {
    return axiosInstance.patch('https://localhost:8080/follow', { userId: id, accepted: true }, { headers: { cookie: myCookies } });
}

function rejectRequest(id: string): Promise<AxiosResponse> {
    return axiosInstance.delete('https://localhost:8080/follow', { userId: id, accepted: true }, { headers: { cookie: myCookies } });
}

function getCommentReplies(id: string): Promise<AxiosResponse> {

    const myURL = new URL('/comments' + '/' + id + '/replies', baseUrl);
    return axiosInstance.get(myURL.href);
}

function getPostRootComments(id: string): Promise<AxiosResponse> {

    const myURL = new URL('/posts' + '/' + id + '/comments', baseUrl);
    return axiosInstance.get(myURL.href);
}

function loginWrapper(): Promise<AxiosResponse> {
    return login(userCredentials);
}

function commentsSetup() {
    return signup()
        .then(() => createParentWrapper());
}

function userCleanUp() {
    return login(userCredentials)
        .then(() => deleteUser());
}

function userCleanUp2() {
    return login(userCredentials2)
        .then(() => deleteUser());
}

function createParentWrapper() {
    return createDummyComment(undefined, userCredentials);
}

function createChildWrapper() {
    return createDummyComment(commentCreateParent.id!, userCredentials);
}

function wrongUserSetup() {
    return commentsSetup()
        .then(() => logout())
        .then(() => signup2());
}

function wrongUserCleanup() {
    return userCleanUp()
        .then(() => userCleanUp2());
}

describe('Comment tests', function () {

    before(commentsSetup);
    after(userCleanUp);

    describe('Comment tests logged out', function () {

        before(logout);

        describe('#Logged out (needs authentication)', function () {
            context('Create comment', function () {
                it('Should be FAIL', async () => {
                    return create({})
                        .catch((error: AxiosError<GenericResponse<Comment>>) => errorHandler(error, 403, errorCodes.notLoggedIn));
                });
            });

            context('Edit comment', function () {
                it('Should be FAIL', async () => {
                    return edit({}, "id")
                        .catch((error: AxiosError<GenericResponse<Comment>>) => errorHandler(error, 403, errorCodes.notLoggedIn));
                });
            });
        });

        describe('#Logged out (does not need authentication)', function () {

            before(createChildWrapper);

            context('Get single comment', function () {
                it('Should be SUCCESS', async () => {
                    const response: AxiosResponse<GenericResponse<Comment>> = await getSingleComment(commentCreateParent.id!);
                    expect(response.status).to.equal(200);
                    expect(response.data).to.have.property('content');
                    const id: string = response.data.content.id;
                    expect(id).to.be.a('string');
                    expect(id).to.equal(commentCreateParent.id);
                });
            });

            context('Get comment replies', function () {
                it('Should be SUCCESS', async () => {
                    const response: AxiosResponse<GenericResponse<Comment[]>> = await getCommentReplies(commentCreateParent.id!);
                    expect(response.status).to.equal(200);
                    expect(response.data).to.have.property('content');
                    const replies: Comment[] = response.data.content;
                    expect(replies).to.be.an('array');
                });
            });

            context('Get root comments on post', function () {
                it('Should be SUCCESS', async () => {
                    const response: AxiosResponse<GenericResponse<Comment[]>> = await getPostRootComments(createdPost.id!);
                    expect(response.status).to.equal(200);
                    expect(response.data).to.have.property('content');
                    const comments: Comment[] = response.data.content;
                    expect(comments).to.be.an('array');
                    // console.log(posts);
                });
            });
        });
    });

    describe('Comment tests logged in', function () {
        before(loginWrapper);

        context('Create comment', function () {
            it('Should be SUCCESS', async () => {

                const response: AxiosResponse<GenericResponse<Comment>> = await create({
                    postId: createdPost.id!,
                    content: "Test comment",
                });

                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('content');
                const id: string = response.data.content.id;
                expect(id).to.be.a('string');
                expect(response.data.content.postId).to.equal(createdPost.id!);
            });
        });

        context('Edit comment', function () {
            it('Should be SUCCESS', async () => {
                const response: AxiosResponse<GenericResponse<Comment>> = await edit({ content: "modified" }, commentCreateParent.id!);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('content');
                const id: string = response.data.content.id;
                expect(id).to.be.a('string');
                expect(id).to.equal(commentCreateParent.id!);
                expect(response.data.content.content).to.equal("modified");
            });
        });

    });
});

describe('Comment tests logged in with wrong user', function () {
    before(wrongUserSetup);
    after(wrongUserCleanup);

    context('Edit comment', function () {
        it('Should be FAIL', async () => {
            return edit({ content: "modified" }, commentCreateParent.id!)
                .catch((error: AxiosError<GenericResponse<Post>>) => errorHandler(error, 403, errorCodes.unAuthorized));
        });
    });
});

