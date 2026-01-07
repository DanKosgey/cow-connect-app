
import * as Crypto from 'expo-crypto';

export const hashPassword = async (password: string): Promise<string> => {
    return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
    );
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    const newHash = await hashPassword(password);
    return newHash === hash;
};
