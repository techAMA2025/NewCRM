
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.HELLO_DROP_CHOO,
});

export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

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

        const imageUrl = response.data[0]?.url;

        if (!imageUrl) {
            throw new Error('No image URL returned from OpenAI');
        }

        return NextResponse.json({ imageUrl });
    } catch (error) {
        console.error('Error generating image:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

export const runtime = 'edge';