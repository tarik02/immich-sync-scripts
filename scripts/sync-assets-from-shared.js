#!/usr/bin/env node

import JSON5 from 'json5';
import * as Path from 'node:path';
import { z } from 'zod';

const {
    API_URL: apiUrl,
    API_KEY: apiKey,
    REMOTE_URL: remoteUrl,
    SHARE_KEY: shareKey,
} = z.object({
    API_URL: z.string().url(),
    API_KEY: z.string(),
    REMOTE_URL: z.string().url(),
    SHARE_KEY: z.string(),
}).parse(
    process.env
);

const assets = await fetch(`${ remoteUrl }/share/${ shareKey }`)
    .then(response => response.text())
    .then(
        text => text.match(/^\s*const data = (.+);$/m)[1].replace(/void 0/g, 'null')
    )
    .then(text => JSON5.parse(text)[1].data.sharedLink.assets);

const groupedByDeviceId = assets.reduce((acc, asset) => {
    const deviceId = asset.deviceId;
    acc[deviceId] = acc[deviceId] ?? [];
    acc[deviceId].push(asset);
    return acc;
}, {});

for (const [deviceId, assetsByDevice] of Object.entries(groupedByDeviceId)) {
    const {
        existingIds
    } = await fetch(`${ apiUrl }/api/asset/exist`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Api-Key': apiKey,
        },
        body: JSON.stringify({
            deviceId,
            deviceAssetIds: assetsByDevice.map(asset => asset.deviceAssetId)
        })
    }).then(response => response.json());

    for (const asset of assetsByDevice) {
        if (existingIds.includes(asset.deviceAssetId)) {
            console.log(`Skipping remote asset ${ asset.id } (already uploaded)`);
            continue;
        }

        const formData = new FormData();

        formData.append('assetType', asset.type);
        formData.append(
            'assetData',
            await fetch(`${ remoteUrl }/api/asset/download/${ encodeURIComponent(asset.id) }?key=${ encodeURIComponent(shareKey) }`).then(response => response.blob())
        );

        formData.append('deviceId', asset.deviceId);
        formData.append('deviceAssetId', asset.deviceAssetId);
        formData.append('fileCreatedAt', asset.fileCreatedAt);
        formData.append('fileModifiedAt', asset.fileModifiedAt);
        formData.append('isFavorite', false);
        formData.append('fileExtension', Path.extname(asset.originalPath));

        const { id, duplicate } = await fetch(`${ apiUrl }/api/asset/upload`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'X-Api-Key': apiKey
            },
            body: formData
        }).then(response => response.json());

        console.log(`Uploaded remote asset ${ asset.id } as ${ id }`);

        if (duplicate) {
            console.warn(
                `Found duplicates. Local asset:`,
                await fetch(`${ apiUrl }/api/asset/assetById/${ id }`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Api-Key': apiKey,
                    }
                }).then(response => response.json()),
                `Remote asset:`,
                asset,
            );
        }
    }
}
