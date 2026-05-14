import {
  hashPassword,
  comparePasswords,
  generateToken,
} from "../utils/auth.js";
import { validate, schemas } from "../utils/validation.js";
import {
  createUser,
  getUserByEmail,
  createRefreshTokenRecord,
  getRefreshTokenRecord,
  deleteRefreshToken,
} from "../db/database.js";
import crypto from "crypto";

export default async function authRoutes(fastify) {
  // Sign up
  fastify.post("/signup", async (request, reply) => {
    const { error, value } = validate(request.body, schemas.signup);

    if (error) {
      return reply.status(400).send({
        error: "Validation failed",
        details: error.details,
      });
    }

    try {
      // Check if user exists
      const existingUser = await getUserByEmail(value.email);
      if (existingUser) {
        return reply.status(409).send({
          error: "User already exists",
          message: "An account with this email already exists",
        });
      }

      const hashedPassword = await hashPassword(value.password);
      const user = await createUser({
        name: value.name,
        email: value.email,
        passwordHash: hashedPassword,
        university: value.university,
        facebook: value.facebook || null,
        instagram: value.instagram || null,
        isSharingEnabled: true,
        autoDeleteHistory: true,
      });

      const token = generateToken(fastify, {
        userId: user.id,
        email: user.email,
      });

      // Generate Refresh Token
      const refreshToken = crypto.randomBytes(40).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
      await createRefreshTokenRecord(user.id, refreshToken, expiresAt);

      reply.status(201).send({
        message: "User created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          university: user.university,
          friend_code: user.friend_code,
          avatarUrl: user.avatar_url || null,
        },
        token,
        refreshToken,
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: "Signup failed",
        message: err.message,
      });
    }
  });

  // Login
  fastify.post("/login", async (request, reply) => {
    fastify.log.info("Login request details:", {
      body: request.body,
      headers: request.headers,
      method: request.method,
      url: request.url,
    });

    const { error, value } = validate(request.body, schemas.login);

    if (error) {
      fastify.log.error("Validation error:", {
        error: error.details,
        receivedBody: request.body,
      });
      return reply.status(400).send({
        error: "Validation failed",
        details: error.details,
        receivedBody: request.body,
      });
    }

    try {
      const user = await getUserByEmail(value.email);
      if (!user) {
        return reply.status(401).send({
          error: "Invalid credentials",
          message: "Email or password is incorrect",
        });
      }

      const passwordMatch = await comparePasswords(
        value.password,
        user.password_hash,
      );
      if (!passwordMatch) {
        return reply.status(401).send({
          error: "Invalid credentials",
          message: "Email or password is incorrect",
        });
      }

      const token = generateToken(fastify, {
        userId: user.id,
        email: user.email,
      });

      // Generate Refresh Token
      const refreshToken = crypto.randomBytes(40).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
      await createRefreshTokenRecord(user.id, refreshToken, expiresAt);

      reply.send({
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          university: user.university,
          friend_code: user.friend_code,
          isSharingEnabled: user.is_sharing_enabled,
          autoDeleteHistory: user.auto_delete_history,
          avatarUrl: user.avatar_url || null,
        },
        token,
        refreshToken,
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({
        error: "Login failed",
        message: err.message,
      });
    }
  });

  // Verify token
  fastify.get("/verify", async (request, reply) => {
    try {
      await request.jwtVerify();
      const { getUserById } = await import("../db/database.js");
      const user = await getUserById(request.user.userId);

      if (!user) {
        return reply.status(404).send({
          error: "User not found",
        });
      }

      reply.send({
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          university: user.university,
          friend_code: user.friend_code,
          avatarUrl: user.avatar_url || null,
        },
      });
    } catch (err) {
      reply.status(401).send({
        valid: false,
        error: "Invalid token",
      });
    }
  });

  // Refresh token
  fastify.post("/refresh", async (request, reply) => {
    const { refreshToken } = request.body;
    if (!refreshToken)
      return reply.status(400).send({ error: "Refresh token required" });

    try {
      const record = await getRefreshTokenRecord(refreshToken);
      if (!record || new Date(record.expires_at) < new Date()) {
        if (record) await deleteRefreshToken(refreshToken);
        return reply
          .status(401)
          .send({ error: "Invalid or expired refresh token" });
      }

      const { getUserById } = await import("../db/database.js");
      const user = await getUserById(record.user_id);
      if (!user) return reply.status(404).send({ error: "User not found" });

      // Rotate Refresh Token
      await deleteRefreshToken(refreshToken);
      const newRefreshToken = crypto.randomBytes(40).toString("hex");
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);
      await createRefreshTokenRecord(user.id, newRefreshToken, newExpiresAt);

      const newToken = generateToken(fastify, {
        userId: user.id,
        email: user.email,
      });

      reply.send({
        token: newToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      fastify.log.error(err);
      reply.status(500).send({ error: "Refresh failed" });
    }
  });

  // Logout (client-side only, but now we can clear DB)
  fastify.post("/logout", async (request, reply) => {
    const { refreshToken } = request.body;
    if (refreshToken) await deleteRefreshToken(refreshToken).catch(() => {});
    reply.send({
      message: "Logged out successfully",
    });
  });
}
