import { randomUUID } from "node:crypto";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { badRequest } from "../utils/errors.js";
import { deleteObject, signedGetUrl, uploadObject } from "./storageService.js";

const IMAGE_MIME_TO_EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const assertImageFile = (file) => {
  if (!file) throw badRequest("No file uploaded.");
  if (!IMAGE_MIME_TO_EXTENSION[file.mimetype]) {
    throw badRequest("Only JPEG, PNG, GIF, WebP, HEIC, and HEIF images are allowed.");
  }
};

const assertReadableImage = async (file) => {
  try {
    await sharp(file.buffer, { animated: file.mimetype === "image/gif" }).metadata();
  } catch {
    throw badRequest("Uploaded image is invalid or could not be processed.");
  }
};

export const imageExtension = (file) =>
  IMAGE_MIME_TO_EXTENSION[file.mimetype] || path.extname(file.originalname || "").replace(".", "") || "bin";

const safeExtension = (file, fallback = "bin") =>
  path.extname(file?.originalname || "").replace(".", "").toLowerCase() || fallback;

const mediaKey = ({ keyPrefix, ownerId, extension }) =>
  `${keyPrefix}/${ownerId}/${Date.now()}-${randomUUID()}.${extension}`;

export const processPostImage = async (file) => {
  const detected = await fileTypeFromBuffer(file.buffer).catch(() => null);
  const mimetype = IMAGE_MIME_TO_EXTENSION[detected?.mime] ? detected.mime : file.mimetype;
  const imageFile = { ...file, mimetype };

  assertImageFile(imageFile);
  const isHeic = imageFile.mimetype === "image/heic" || imageFile.mimetype === "image/heif";
  try {
    await sharp(imageFile.buffer, { animated: imageFile.mimetype === "image/gif" }).metadata();
  } catch {
    if (isHeic) {
      return {
        buffer: imageFile.buffer,
        contentType: imageFile.mimetype,
        extension: imageExtension(imageFile),
      };
    }
    throw badRequest("Uploaded image is invalid or could not be processed.");
  }
  if (imageFile.mimetype === "image/gif") {
    return { buffer: imageFile.buffer, contentType: "image/gif", extension: "gif" };
  }
  const format = imageFile.mimetype === "image/png" ? "png" : "jpeg";
  try {
    const buffer = await sharp(imageFile.buffer)
      .resize({ width: 1080, height: undefined, fit: "inside", withoutEnlargement: true })
      .toFormat(format, { quality: 72 })
      .toBuffer();
    return {
      buffer,
      contentType: format === "png" ? "image/png" : "image/jpeg",
      extension: format === "png" ? "png" : "jpg",
    };
  } catch (error) {
    if (isHeic) {
      return {
        buffer: imageFile.buffer,
        contentType: imageFile.mimetype,
        extension: imageExtension(imageFile),
      };
    }
    throw error;
  }
};

export const processProfileImage = async (file) => {
  assertImageFile(file);
  await assertReadableImage(file);
  const thumbFormat = file.mimetype === "image/png" ? "png" : "jpeg";
  const thumbContentType = thumbFormat === "png" ? "image/png" : "image/jpeg";
  const source = sharp(file.buffer);
  const metadata = await source.metadata();
  const crop = file.crop || {};
  const displaySize = Number(crop.displaySize) || 0;
  const scale = Math.max(1, Number(crop.scale) || 1);
  const translateX = Number(crop.x) || 0;
  const translateY = Number(crop.y) || 0;
  const sourceWidth = metadata.width || Number(crop.sourceWidth) || 1;
  const sourceHeight = metadata.height || Number(crop.sourceHeight) || 1;
  const coverScale = displaySize > 0
    ? Math.max(displaySize / sourceWidth, displaySize / sourceHeight)
    : Math.max(1080 / sourceWidth, 1080 / sourceHeight);
  const cropWidth = Math.max(1, Math.min(sourceWidth, Math.round((displaySize || Math.min(sourceWidth, sourceHeight)) / (coverScale * scale))));
  const cropHeight = Math.max(1, Math.min(sourceHeight, Math.round((displaySize || Math.min(sourceWidth, sourceHeight)) / (coverScale * scale))));
  const displayedWidth = sourceWidth * coverScale * scale;
  const displayedHeight = sourceHeight * coverScale * scale;
  const left = displaySize > 0
    ? Math.round(((displayedWidth - displaySize) / 2 - translateX) / (coverScale * scale))
    : Math.round((sourceWidth - cropWidth) / 2);
  const top = displaySize > 0
    ? Math.round(((displayedHeight - displaySize) / 2 - translateY) / (coverScale * scale))
    : Math.round((sourceHeight - cropHeight) / 2);
  const extract = {
    left: Math.max(0, Math.min(left, sourceWidth - cropWidth)),
    top: Math.max(0, Math.min(top, sourceHeight - cropHeight)),
    width: cropWidth,
    height: cropHeight,
  };
  const format = file.mimetype === "image/png" ? "png" : "jpeg";
  const large = await sharp(file.buffer)
    .extract(extract)
    .resize({ width: 1080, height: 1080, fit: "cover", withoutEnlargement: true })
    .toFormat(format, { quality: 72 })
    .toBuffer();

  const small = await sharp(file.buffer)
    .extract(extract)
    .resize(160, 160, { fit: "cover" })
    .toFormat(thumbFormat, { quality: 82 })
    .toBuffer();

  return { large, small, thumbContentType, thumbExtension: thumbFormat === "jpeg" ? "jpg" : "png" };
};

export const uploadImage = async ({ file, buffer, keyPrefix, ownerId, contentType, extension }) => {
  const resolvedExtension = extension || imageExtension(file);
  const key = mediaKey({ keyPrefix, ownerId, extension: resolvedExtension });
  return uploadObject({ buffer, key, contentType: contentType || file.mimetype });
};

export const detectBufferContentType = async (file) => {
  const detected = await fileTypeFromBuffer(file.buffer).catch(() => null);
  return {
    mime: detected?.mime || file.mimetype || "application/octet-stream",
    extension: detected?.ext || safeExtension(file),
  };
};

export const uploadAttachment = async ({ file, keyPrefix, ownerId }) => {
  if (!file) throw badRequest("No attachment uploaded.");
  const detected = await detectBufferContentType(file);
  const key = mediaKey({ keyPrefix, ownerId, extension: detected.extension });
  await uploadObject({ buffer: file.buffer, key, contentType: detected.mime });
  return { key, mime: detected.mime };
};

export const signMediaUrl = async (key, expiresIn = 300) =>
  key ? signedGetUrl(key, expiresIn) : null;

export const deleteMedia = async (key) => {
  if (key) await deleteObject(key);
};

export const bufferToDataUrl = (buffer, mime = "image/jpeg") =>
  buffer ? `data:${mime};base64,${buffer.toString("base64")}` : null;
