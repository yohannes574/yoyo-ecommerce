const crypto = require("crypto");

/** Generate a random n-digit numeric code (default 6). */
const generateCode = (length = 6) => {
  const max = Math.pow(10, length);
  const num = crypto.randomInt(0, max);
  return num.toString().padStart(length, "0");
};

/** Expiry date offset from now (default 15 minutes). */
const codeExpiry = (minutes = 15) => new Date(Date.now() + minutes * 60 * 1000);

module.exports = { generateCode, codeExpiry };