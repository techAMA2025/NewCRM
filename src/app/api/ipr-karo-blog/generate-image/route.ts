import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { storage } from '@/firebase/iprkaro';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.HELLO_DROP_CHOO,
});

export async function POST(request: NextRequest) {
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (!process.env.HELLO_DROP_CHOO) {
            return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
        }

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: `${prompt} | Professional blog header, high quality, realistic, modern aesthetic`,
            n: 1,
            size: "1024x1024",
            quality: "standard",
        });

        const tempImageUrl = response.data?.[0]?.url;

        if (!tempImageUrl) {
            throw new Error('No image URL returned from OpenAI');
        }

        // Fetch the image from OpenAI URL
        const imageResponse = await fetch(tempImageUrl);
        if (!imageResponse.ok) {
            throw new Error('Failed to fetch image from OpenAI storage');
        }

        const imageBuffer = await imageResponse.arrayBuffer();

        // Upload to Firebase Storage
        const filename = `ai_generated_${Date.now()}.png`;
        const storageRef = ref(storage, `blog-images/${filename}`);

        const snapshot = await uploadBytes(storageRef, new Uint8Array(imageBuffer), {
            contentType: 'image/png'
        });

        // Get permanent download URL
        const imageUrl = await getDownloadURL(snapshot.ref);

        return NextResponse.json({ imageUrl });
    } catch (error: any) {
        console.error('Error in generate-image API:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate and store image' }, { status: 500 });
    }
}