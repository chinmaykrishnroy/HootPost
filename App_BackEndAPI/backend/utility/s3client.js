import config from '../config/config.js';
import { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand,DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'your-region', // replace with your S3 region
  endpoint: 'https://s3.eu-central-003.backblazeb2.com',
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});
export const initializeS3 = async () => {
  try {
    const command = new ListBucketsCommand({});
    const { Buckets } = await s3Client.send(command);
    console.log('S3 connected: Buckets available -', Buckets);
    return s3Client;
  } catch (error) {
    console.error('Error initializing S3 (Backblaze):', error);
    throw error;
  }
};
export const uploadFileToS3 = async (fileBuffer, fileName, mimeType) => {
  const params = {
    Bucket: config.S3_BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType,
  };
  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    return `https://s3.eu-central-003.backblazeb2.com/${config.S3_BUCKET_NAME}/${fileName}`;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
};
export const downloadFileFromS3 = async (fileName) => {
  const params = {
    Bucket: config.S3_BUCKET_NAME,
    Key: fileName,
  };

  try {
    const command = new GetObjectCommand(params);
    const data = await s3Client.send(command);
    return data.Body;
  } catch (error) {
    console.error('Error downloading file from S3:', error);
    throw error;
  }
};
export const deleteFileFromS3 = async (fileName) => {
    const params = {
      Bucket: config.S3_BUCKET_NAME,
      Key: fileName,
    };
    try {
      const command = new DeleteObjectCommand(params);
      await s3Client.send(command);
      console.log(`Deleted an item: ${fileName}`);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
    }
  };

  export const deleteMultipleFilesFromS3 = async (fileNames) => {
    if (!fileNames || fileNames.length === 0) return;
  
    const deleteParams = {
      Bucket: config.S3_BUCKET_NAME,
      Delete: {
        Objects: fileNames.map(fileName => ({ Key: fileName })),
      },
    };
  
    try {
      const command = new DeleteObjectsCommand(deleteParams);
      await s3Client.send(command);
      console.log(`Deleted ${fileNames.length} files from S3`);
    } catch (error) {
      console.error('Error deleting multiple files from S3:', error);
      throw error;
    }
  };

  export const deleteAllFilesFromS3 = async () => {
    try {
      const command = new ListObjectsV2Command({
        Bucket: config.S3_BUCKET_NAME,
      });
      const data = await s3Client.send(command);
      if (!data.Contents || data.Contents.length === 0) {
        console.log("No files to delete from S3.");
        return;
      }
      const fileNames = data.Contents.map(file => file.Key);
      await deleteMultipleFilesFromS3(fileNames);
      console.log(`Successfully deleted ${fileNames.length} files from S3.`);
    } catch (error) {
      console.error('Error deleting all files from S3:', error);
      throw error;
    }
  };

  export const generateSignedUrl = async (fileName, expiresIn) => {
    const command = new GetObjectCommand({
      Bucket: config.S3_BUCKET_NAME,
      Key: fileName,
    });
    try {
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresIn });
      return signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Could not generate signed URL');
    }
  };
