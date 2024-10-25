import dotenv from 'dotenv';
dotenv.config();

export default {
    port: process.env.PORT || 5000,
    mongoURI: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    secure: process.env.NODE_ENV === 'production',
    ADMIN: process.env.ADMIN_PASSWORD,
    B2_KEY_ID: process.env.B2_KEY_ID,
    B2_APPLICATION_KEY: process.env.B2_APPLICATION_KEY,
    B2_BUCKET_ID: process.env.B2_BUCKET_ID,
    B2_BUCKET_NAME: process.env.B2_BUCKET_NAME,

    AWS_ACCESS_KEY_ID: process.env.B2_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.B2_APPLICATION_KEY,
    S3_BUCKET_ID: process.env.B2_BUCKET_ID,
    S3_BUCKET_NAME: process.env.B2_BUCKET_NAME,
};
