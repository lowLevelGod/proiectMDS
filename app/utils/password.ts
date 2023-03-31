import bcrypt from 'bcrypt';
import { knexInstance } from './globals';

// for database storage
export function hashPassword(password: string): Promise<string> {
    const saltRounds: number = 10;
    return bcrypt
        .hash(password, saltRounds);
}

export function validateUser(password: string, storedHash: string): Promise<boolean> {
    return bcrypt
        .compare(password, storedHash)
        .then(res => res)
        .catch(err => {
            console.error(err.message)
            return false;
        });
}

// cannot have 2 users with same email
export function isEmailUnique(email: string): Promise<boolean> {
    return knexInstance
        .column('email')
        .select()
        .from('Users')
        .where('email', email)
        .then((x) => x.length === 0)
        .catch(err => {
            console.log(err.message);
            return false;
        });
}


export function getUserPassword(email: string): Promise<string> {
    return knexInstance
        .select('passwordHash')
        .from('Users')
        .where('email', email)
        .then(x => {
            if (x.length === 0)
                return undefined;
            return x[0].passwordHash;
        })
        .catch(err => {
            console.error(err.message)
            return undefined;
        });

}