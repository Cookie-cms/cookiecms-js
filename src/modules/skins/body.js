import { join } from 'path';
import renderer from '@cookie-cms/renderer';

export default async function renderBody(req, res) {
    try {
        if (!req.params?.uuid) {
            return res.status(400).send('UUID parameter is required');
        }

        const skinPath = join('uploads/skins/', `${req.params.uuid}.png`);
        const output = await renderer.renderBody2D(skinPath, 300);
        
        res.setHeader('Content-Type', 'image/png');
        res.send(output);
    } catch (error) {
        console.error('Error rendering body:', error);
        res.status(500).send('Error rendering body image');
    }
}