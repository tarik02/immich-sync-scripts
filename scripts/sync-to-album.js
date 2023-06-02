#!/usr/bin/env node

import { z } from 'zod';

const {
    API_URL: apiUrl,
    API_KEY: apiKey,
    PERSON_ID: personId,
    ALBUM_ID: albumId,
} = z.object({
    API_URL: z.string().url(),
    API_KEY: z.string(),
    PERSON_ID: z.string(),
    ALBUM_ID: z.string(),
}).parse(
    process.env
);

const assets = await fetch(`${ apiUrl }/api/person/${ personId }/assets`, {
    headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json',
    },
}).then(response => response.json());

await fetch(`${ apiUrl }/api/album/${ albumId }/assets`, {
    method: 'PUT',
    headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        assetIds: assets.map(asset => asset.id),
    }),
});
