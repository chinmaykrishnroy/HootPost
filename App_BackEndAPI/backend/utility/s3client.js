import {
  deleteAllObjects,
  deleteObject,
  deleteObjects,
  initializeStorage,
  signedGetUrl,
  uploadObject,
} from "../services/storageService.js";

export const initializeS3 = initializeStorage;

export const uploadFileToS3 = async (fileBuffer, fileName, mimeType) =>
  uploadObject({ buffer: fileBuffer, key: fileName, contentType: mimeType });

export const downloadFileFromS3 = async () => {
  throw new Error("Direct downloads are disabled. Use signed URLs.");
};

export const deleteFileFromS3 = deleteObject;

export const deleteMultipleFilesFromS3 = deleteObjects;

export const deleteAllFilesFromS3 = deleteAllObjects;

export const generateSignedUrl = signedGetUrl;
