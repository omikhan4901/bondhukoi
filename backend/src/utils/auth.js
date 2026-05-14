import bcrypt from 'bcrypt';

export const hashPassword = async (password) => {
  return bcrypt.hash(password, 10);
};

export const comparePasswords = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (fastify, payload, expiresIn = '1h') => {
  return fastify.jwt.sign(payload, { expiresIn });
};

export const verifyToken = (fastify, token) => {
  try {
    return fastify.jwt.verify(token);
  } catch (err) {
    return null;
  }
};

/**
 * Generate a short, unique friend code (6 characters)
 * Uses base36 encoding (0-9, a-z) for readability
 */
export const generateFriendCode = () => {
  // Generate a random number and convert to base36, take first 6 chars
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  return code;
};
