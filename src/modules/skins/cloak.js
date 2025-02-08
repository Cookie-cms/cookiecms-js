import { join } from 'path';
import { access } from 'fs/promises';
import sharp from 'sharp'; // Add sharp for image processing
import renderer from '@cookie-cms/renderer';

export default async function renderCloak(req, res) {
    try {
        if (!req.params?.idcape) {
            return res.status(400).send('Cape ID parameter is required');
        }

        const skinPath = join(process.cwd(), 'uploads/capes', `${req.params.idcape}.png`);
        
        // Check if file exists
        try {
            await access(skinPath);
        } catch {
            return res.status(404).send('Cape file not found');
        }

        // Validate cape dimensions
        const metadata = await sharp(skinPath).metadata();
        if (metadata.width / metadata.height !== 2) {
            return res.status(400).send('Invalid cape image: aspect ratio must be 2:1');
        }

        const output = await renderer.renderCapeFront(skinPath, 300);
        
        res.setHeader('Content-Type', 'image/png');
        res.send(output);
    } catch (error) {
        console.error('Error rendering cape:', error);
        res.status(500).send('Error rendering cape image');
    }
}