import { fileTypeFromBuffer } from 'file-type';

export const detectFileType = async (buffer) => {
    try {
        const detectedFileType = await fileTypeFromBuffer(buffer);
        if (!detectedFileType) {
            throw new Error('Unable to determine the file type');
        }
        return detectedFileType.mime; // Return the MIME type
    } catch (error) {
        throw new Error('Error detecting file type: ' + error.message);
    }
};

export const handleError = (res, err) => {
    console.error(err);
    res.status(400).send(err.message);
};