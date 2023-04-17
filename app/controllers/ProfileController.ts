import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { Follower, Profile, User, knexInstance } from '../utils/globals';
import { craftError, errorCodes } from '../utils/error';
import { File, Post, craftPictureDest, deleteFiles, moveFiles, zipDirectory } from '../utils/globals';
import { v4 as uuidv4 } from 'uuid';

const defaultProfilePictureURL = "";

function getProfileMetaData(profile: Profile): Partial<Profile> {
    let profileMetaData: Partial<Profile> = {
        id: profile.id,
        userId: profile.userId,
        username: profile.username,
        name: profile.name,
        bio: profile.bio,
    };

    return profileMetaData;
}

export class ProfileController {
    
    create(req: Request, res: Response, next: NextFunction) {
        let pictureURL: string = defaultProfilePictureURL;

        if (req.file) {
            pictureURL = req.file.filename;
        }

        let profile = {
            id: uuidv4(),
            userId: req.session.user!.id,
            username: req.body.username,
            name: req.body.name,
            profilePictureURL: pictureURL,
            bio: req.body.bio 
        }

        knexInstance('Profiles')
            .insert(profile)
            .then(x => {
                // we don't send image url
                let profileMetaData: Partial<Profile> = getProfileMetaData(profile);
                return res.status(200).json({ error: undefined, content: profileMetaData });
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.failedToUpload, "Please try uploading again!");
                return res.status(500).json({ error, content: undefined });
            })
    }
}

// export interface Profile {
//     id: string, 
//     userId: string,
//     username: string,
//     name: string,
//     profilePictureURL?: string,
//     bio?: string
// }
