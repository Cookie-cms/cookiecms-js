import path from 'path';
import fs from 'fs';


async function sendFile(res, filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }
        res.setHeader('Content-Type', 'image/png');
        fs.createReadStream(filePath).pipe(res);
    } catch (error) {
        logger.error('Error sending file:', error);
        res.status(500).send('Internal server error');
    }
}

export async function getFileByName(req, res) {
    const filePath = path.join('uploads/skins/', `${req.params.uuid}.png`);
    return sendFile(res, filePath);
}

export default getFileByName;