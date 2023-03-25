
export interface UserInfo {
    id: string,
    username: string,
    email: string,
}


export interface Post {
    id: string,
    createdAt: Date,
    userId: string, 
    description?: string,
    picturesURLs: string[],
}