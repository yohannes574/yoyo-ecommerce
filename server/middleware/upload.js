const multer = require("multer");
const path = require("path");

const memoryStorage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif|svg/;

  const okExt = allowed.test(
    path.extname(file.originalname).toLowerCase()
  );

  const okMime = allowed.test(file.mimetype);

  if (okExt || okMime) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only image files (jpg, png, webp, gif, svg) are allowed"
      )
    );
  }
};

const uploadProductImages = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const uploadReceipt = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = {
  uploadProductImages,
  uploadReceipt,
};
