const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Number, default: 0 },
});

/** Atomically increment a named counter and return its new value. */
counterSchema.statics.increment = async function (name) {
  const doc = await this.findOneAndUpdate(
    { name },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return doc.value;
};

module.exports = mongoose.model("Counter", counterSchema);