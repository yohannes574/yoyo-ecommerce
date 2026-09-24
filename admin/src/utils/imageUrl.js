const API_URL = import.meta.env.VITE_API_URL || "";

const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export function getImageUrl(image) {
  if (!image) return "";

  // Cloudinary or any other complete URL
  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  // Local/legacy uploaded image
  if (image.startsWith("/")) {
    return `${API_ORIGIN}${image}`;
  }

  return image;
}

