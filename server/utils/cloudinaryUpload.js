const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const uploadBuffer = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    console.log("Cloudinary upload starting...");
    console.log("Folder:", folder);
    console.log("Buffer size:", buffer?.length);

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error("CLOUDINARY UPLOAD ERROR:", error);
          reject(error);
        } else {
          console.log("CLOUDINARY UPLOAD SUCCESS");
          console.log("URL:", result.secure_url);
          console.log("Public ID:", result.public_id);

          resolve(result);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

module.exports = {
  uploadBuffer,
};