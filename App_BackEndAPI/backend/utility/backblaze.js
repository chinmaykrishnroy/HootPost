import BackblazeB2 from 'backblaze-b2';
import config from '../config/config.js';

const b2 = new BackblazeB2({
  applicationKeyId: config.B2_KEY_ID,
  applicationKey: config.B2_APPLICATION_KEY
});

export const initializeB2 = async () => {
  try {
    const authResponse = await b2.authorize();
    console.log('Backblaze B2 connected');
    console.log('Authorization Token:', authResponse.data.authorizationToken);

    // List buckets
    const bucketsResponse = await b2.listBuckets();
    console.log('Buckets:', bucketsResponse.data.buckets); // log the buckets
  } catch (error) {
    console.error('Error connecting to Backblaze B2:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Request Config:', error.response.config);
      console.error('Status:', error.response.status);
    }
  }
};

export const uploadFileToB2 = async (fileBuffer, fileName, mimeType) => {
  try {
    const bucketId = config.B2_BUCKET_ID;
    const response = await b2.getUploadUrl({ bucketId });
    const uploadResponse = await b2.uploadFile({
      uploadUrl: response.data.uploadUrl,
      uploadAuthToken: response.data.authorizationToken,
      fileName,
      data: fileBuffer,
      mimeType
    });
    return uploadResponse.data.fileName;  // Use fileName here for future reference
  } catch (error) {
    console.error('Error uploading file to B2:', error);
    throw error;
  }
};


export const downloadFileFromB2 = async (fileId) => {
  try {
    const response = await b2.downloadFileById({ fileId });
    return response.data;
  } catch (error) {
    console.error('Error downloading file from B2:', error);
    throw error;
  }
};

export const generateSignedUrl = async (fileName, expiresIn) => {
  try {
    const bucketId = config.B2_BUCKET_ID;
    console.log('Bucket ID:', bucketId); // Log for debugging
    console.log('Bucket Name:', config.B2_BUCKET_NAME); // Log for debugging
    
    const response = await b2.getDownloadAuthorization({
      bucketId: bucketId,
      fileNamePrefix: fileName, // Use the passed filename
      validDurationInSeconds: expiresIn
    });

    const signedUrl = `https://f002.backblazeb2.com/file/${config.B2_BUCKET_NAME}/${fileName}?Authorization=${response.data.authorizationToken}`;
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};
