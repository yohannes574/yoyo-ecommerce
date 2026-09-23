const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "yoyo-dev-secret-change-before-deploying";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

const signToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

module.exports = { signToken, verifyToken };