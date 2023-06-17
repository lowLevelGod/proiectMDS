import express, { Express, Request, Response, RequestHandler, NextFunction } from 'express';
import { Follower, Profile, User, craftProfilePictureDest, craftProfilePictureURL, knexInstance } from '../utils/globals';
import { craftError, errorCodes } from '../utils/error';
import { File, Post, craftPictureDest, deleteFiles, moveFiles, zipDirectory } from '../utils/globals';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const defaultProfilePictureURL = "defaultImage.png";

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

export function getProfileByUserId(userId: string): Promise<Partial<Profile> | undefined> {
    return knexInstance
        .select('id', 'profilePictureURL')
        .from('Profiles')
        .where('userId', userId)
        .then(x => {
            if (x.length === 0) {
                return undefined;
            }
            const res: Partial<Profile> = {
                id: x[0].id,
                profilePictureURL: x[0].profilePictureURL
            };
            return res;
        })
        .catch(err => {
            console.error(err.message);
            return undefined;
        });
}

export class ProfileController {
    
    getProfile(req: Request, res: Response, next: NextFunction) {
        knexInstance
            .select('*')
            .from('Profiles')
            .where('userId', req.params.id)
            .then(arr => {
                if (arr.length === 0) {
                    const error = craftError(errorCodes.notFound, "Profile not found!");
                    return res.status(404).json({ error, content: undefined });
                }

                const profile = arr[0];
                profile.profilePictureURL = path.join(craftProfilePictureURL(profile.userId, profile.profilePictureURL));
                return res.status(200).json({ error: undefined, content: profile });
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            })
    }

    getProfileRange(req: Request, res: Response, next: NextFunction) {
        const idList = req.body.usersIds;
        console.log(idList);
        knexInstance
            .select('*')
            .from('Profiles')
            .whereIn('userId', idList)
            .then(arr => {
                console.log(arr);
                return res.status(200).json({ error: undefined, content: arr });
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            })
    }

    getProfilePicture(req: Request, res: Response, next: NextFunction) {
        knexInstance
            .select('*')
            .from('Profiles')
            .where('id', req.params.id)
            .then(arr => {
                if (arr.length === 0) {
                    const error = craftError(errorCodes.notFound, "Profile not found!");
                    return res.status(404).json({ error, content: undefined });
                }
                // resources/users/{userId}/profile/{pictureId}.extension
                const profilePicturePath = path.join('users', arr[0].userId, 'profile', arr[0].profilePictureURL);
                let partialProfile: Partial<Profile> = {
                    profilePictureURL: profilePicturePath,
                }
                return res.status(200).json({ error: undefined, content: partialProfile });
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            })
    }

    create(req: Request, res: Response, next: NextFunction) {
        let profile = {
            id: uuidv4(),
            userId: req.session.user!.id,
            username: req.body.username,
            name: req.body.name,
            profilePictureURL: req.file === undefined ? defaultProfilePictureURL : req.file.filename,
            bio: req.body.bio 
        }

        knexInstance('Profiles')
            .insert(profile)
            .then(x => {
                return res.status(200).json({ error: undefined, content: profile });
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.failedToUpload, "Please try uploading again!");
                return res.status(500).json({ error, content: undefined });
            })
    }
    
    patch(req: Request, res: Response, next: NextFunction) {
        const userId = req.session.user!.id;

        getProfileByUserId(userId) 
            .then(profile => {
                const updatedProfile: Partial<Profile> = {};
                
                if (req.body.username) {
                    updatedProfile.username = req.body.username;
                }

                if (req.body.name) {
                    updatedProfile.name = req.body.name;
                }

                if (req.body.bio !== undefined) {
                    updatedProfile.bio = req.body.bio;
                }

                if (req.file) {
                    // Delete the old profile picture
                    if (profile!.profilePictureURL !== defaultProfilePictureURL) {
                        const paths = [path.join(craftProfilePictureDest(userId), profile!.profilePictureURL!)];
                        deleteFiles(paths, function (err: any) {
                            if (err) {
                                console.error(err.message);
                            }
                        })
                    }  
                    updatedProfile.profilePictureURL = req.file.filename;
                }

                if (Object.keys(updatedProfile).length === 0) {
                    return res.status(200).json({ error: undefined, content: undefined });   
                }

                const query = knexInstance('Profiles')
                    .where('id', profile!.id)
                    .update(updatedProfile, '*');

                query
                    .then(arr => {
                        if (arr.length === 0) {
                            const error = craftError(errorCodes.notFound, "Profile not found!");
                            return res.status(404).json({ error, content: undefined });
                        }

                        return res.status(200).json({ error: undefined, content: arr[0] });
                    })
                    .catch(err => {
                        console.error(err.message);
                        const error = craftError(errorCodes.other, "Please try again!");
                        return res.status(500).json({ error, content: undefined });
                    })
                
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try again!");
                return res.status(500).json({ error, content: undefined });
            })
    }

    delete(req: Request, res: Response, next: NextFunction) {
        const userId = req.session.user!.id;

        // Find profile in the database
        getProfileByUserId(userId)
            .then(profile => {
                if (!profile) {
                    const error = craftError(errorCodes.notFound, "Profile not found!");
                    return res.status(404).json({ error, content: undefined});
                }

                const profileId = profile!.id;
                const profilePictureURL = profile!.profilePictureURL;

                // Delete the profile from database
                knexInstance
                    .from('Profiles')
                    .where('id', profileId)
                    .del()
                    .then(() => {
                        // Delete the files associated with the profile
                        if (profilePictureURL !== defaultProfilePictureURL) {
                            const paths = [path.join(craftProfilePictureDest(userId), profilePictureURL!)];
                            deleteFiles(paths, function (err: any) {
                                if (err) {
                                    console.error(err.message);
                                }
                                return res.status(200).json({ error: undefined, content: undefined });
                            })
                        }     
                    })
                    .catch(err => {
                        console.error(err.message);
                        const error = craftError(errorCodes.other, "Please try deleting again!");
                        return res.status(500).json({ error, content: undefined });
                    })
            })
            .catch(err => {
                console.error(err.message);
                const error = craftError(errorCodes.other, "Please try deleting again!");
                return res.status(500).json({ error, content: undefined });
            })
    }

    deleteProfilePicture(req: Request, res: Response, next: NextFunction) {
        const userId = req.session.user!.id;

        getProfileByUserId(userId)
            .then(profile => {
                if (!profile) {
                    const error = craftError(errorCodes.notFound, "Profile not found!");
                    return res.status(404).json({ error, content: undefined});
                }

                const profileId = profile!.id;
                const profilePictureURL = profile!.profilePictureURL!;

                if (profilePictureURL !== defaultProfilePictureURL) {
                    // Delete the image from resources
                    const paths = [path.join(craftProfilePictureDest(userId), profilePictureURL)];
                        deleteFiles(paths, function (err: any) {
                            if (err) {
                                console.error(err.message);
                            }
                        })
                    
                    // Set the value of profile photo to default
                    knexInstance
                        .from('Profiles')
                        .where('id', profileId)
                        .update('profilePictureURL', defaultProfilePictureURL)
                        .then(() => {
                            return res.status(200).json({ error: undefined, content: "Profile picture deleted successfully" });
                        })
                        .catch((err) => {
                            console.error(err.message);
                            const error = craftError(errorCodes.other, "Please try again!");
                            return res.status(500).json({ error, content: undefined });
                        });
                } 
                else
                    return res.status(200).json({ error: undefined, content: "No profile picture found to delete" });     
            })
    }    
}
