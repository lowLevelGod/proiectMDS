import path from "path";
import { GenericResponse, Post } from "../../app/utils/globals";
import { AxiosError, AxiosResponse } from "axios";
import { axiosInstance, baseUrl, deleteUser, errorHandler, login, logout, myCookies, readFiles, signup, signup2, user, userCredentials, userCredentials2 } from "../setup";
import FormData from 'form-data';

export function createPost(data: FormData): Promise<AxiosResponse> {
    let headers = data.getHeaders();
    headers.cookie = myCookies;
    return axiosInstance.post('https://localhost:8080/posts', data, { headers });
}

export const postCreate: Partial<Post> = {
    description: "This post is part of testing",
    picturesURLs: [path.join(__dirname, 'Beluga.png')],
}

export let createdPost: Partial<Post>;
export function createDummyPost(): Promise<void> {

    let data = new FormData();
    data.append('description', postCreate.description!);

    return login(userCredentials)
        .then(() => readFiles(postCreate.picturesURLs!))
        .then((files: Buffer[]) => {
            files.forEach((elem) => data.append('media', elem, { filename: 'test_photo.png' }))
        })
        .then(() => createPost(data))
        .then((res: AxiosResponse<GenericResponse<Post>>) => {
            createdPost = res.data.content;
        })
        .then(() => logout())
        .then(() => { });
}