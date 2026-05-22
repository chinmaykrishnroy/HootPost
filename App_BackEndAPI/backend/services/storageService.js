import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import config from "../config/config.js";
import logger from "../utils/logger.js";

const client = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.endpoint,
  forcePathStyle: config.s3.forcePathStyle,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
});

const stripQuery = (value = "") => value.split("?")[0];

export const extractObjectKey = (value = "") => {
  if (!value) return "";
  const clean = stripQuery(value);

  try {
    const url = new URL(clean);
    const path = url.pathname.replace(/^\/+/, "");
    if (path.startsWith(`${config.s3.bucket}/`)) {
      return decodeURIComponent(path.slice(config.s3.bucket.length + 1));
    }
    return decodeURIComponent(path);
  } catch {
    return clean.replace(/^\/+/, "");
  }
};

export const initializeStorage = async () => {
  await client.send(new HeadBucketCommand({ Bucket: config.s3.bucket }));
  logger.info(`Object storage connected: ${config.s3.bucket}`);
};

export const uploadObject = async ({ buffer, key, contentType }) => {
  await client.send(new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return key;
};

export const deleteObject = async (keyOrUrl) => {
  const key = extractObjectKey(keyOrUrl);
  if (!key) return;
  await client.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }));
};

export const deleteObjects = async (keysOrUrls = []) => {
  const keys = keysOrUrls.map(extractObjectKey).filter(Boolean);
  if (keys.length === 0) return;
  await client.send(new DeleteObjectsCommand({
    Bucket: config.s3.bucket,
    Delete: { Objects: keys.map((Key) => ({ Key })) },
  }));
};

export const deleteAllObjects = async () => {
  let continuationToken;
  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: config.s3.bucket,
      ContinuationToken: continuationToken,
    }));
    await deleteObjects((response.Contents || []).map((item) => item.Key));
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
};

export const signedGetUrl = async (keyOrUrl, expiresIn = 300) => {
  const key = extractObjectKey(keyOrUrl);
  if (!key) return null;

  return getSignedUrl(client, new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
  }), { expiresIn });
};

export const publicObjectUrl = (keyOrUrl) => {
  const key = extractObjectKey(keyOrUrl);
  if (!key) return null;
  if (config.s3.publicBaseUrl) return `${config.s3.publicBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(key)}`;
  return key;
};
