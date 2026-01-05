import crypto from "crypto";

const HASH_CONFIG = {
  saltLength: 32,
  iterations: 100000,
  keyLength: 64,
  algorithm: 'sha512' as const
};

export const hashPassCode = (password: string) => {
  return new Promise((resolve, reject) => {
    try {
      const salt = crypto.randomBytes(HASH_CONFIG.saltLength).toString('hex');
      
      const hash = crypto.pbkdf2Sync(
        password, 
        salt, 
        HASH_CONFIG.iterations, 
        HASH_CONFIG.keyLength, 
        HASH_CONFIG.algorithm
      ).toString('hex');
      
      const hashedPassword = `v1:${salt}:${hash}`;
      resolve(hashedPassword);
    } catch (error) {
      reject(error);
    }
  });
};

export const comparePassCode = (password: string, hashed: string) => {
  try {
    const [version, salt, hash] = hashed.split(':');
    
    if (version !== 'v1') {
      throw new Error('Unsupported hash version');
    }
    
    const inputHash = crypto.pbkdf2Sync(
      password, 
      salt, 
      HASH_CONFIG.iterations, 
      HASH_CONFIG.keyLength, 
      HASH_CONFIG.algorithm
    ).toString('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'), 
      Buffer.from(inputHash, 'hex')
    );
  } catch (error) {
    return false;
  }
};

