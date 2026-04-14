
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { storage } from '@/firebase/ama';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
    apiKey: process.env.HELLO_DROP_CHOO,
});

export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // 1. Generate image using DALL-E 3
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
        });

        if (!response.data || response.data.length === 0) {
            throw new Error('No data returned from OpenAI');
        }

        const tempImageUrl = response.data[0]?.url;

        if (!tempImageUrl) {
            throw new Error('No image URL returned from OpenAI');
        }

        // 2. Download the image
        const imageRes = await fetch(tempImageUrl);
        if (!imageRes.ok) {
            throw new Error('Failed to fetch image from OpenAI');
        }
        const imageBuffer = await imageRes.arrayBuffer();

        // 3. Upload to Firebase Storage
        const fileName = `blog-images/${uuidv4()}.png`;
        const storageRef = ref(storage, fileName);

        const snapshot = await uploadBytes(storageRef, new Uint8Array(imageBuffer), {
            contentType: 'image/png',
        });

        // 4. Get permanent download URL
        const imageUrl = await getDownloadURL(snapshot.ref);

        return NextResponse.json({ imageUrl });
    } catch (error) {
        console.error('Error generating image:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';