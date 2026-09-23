const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

/** Read a setting with a fallback default. */
settingSchema.statics.get = async function (key, fallback) {
  const row = await this.findOne({ key });
  if (!row) return fallback;
  return row.value ?? fallback;
};

/** Upsert a setting. */
settingSchema.statics.set = async function (key, value) {
  return this.findOneAndUpdate({ key }, { value }, { new: true, upsert: true });
};

module.exports = mongoose.model("Setting", settingSchema);
