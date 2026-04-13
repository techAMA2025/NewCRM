
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.HELLO_DROP_CHOO,
});

export async function POST(request: Request) {
    try {
        const { content, prompt } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const systemPrompt = `
      You are a professional SEO and AEO expert for AMA Legal Solutions.
      
      **Goal**: Expand the provided HTML content to reach at least 5000 words while maintaining high quality, SEO optimization, and legal accuracy.
      
      **Instructions**:
      1. Follow the user's specific instructions: [${prompt || 'Make it more detailed and exhaustive'}].
      2. Maintain the existing HTML structure and tone.
      3. Add new sections (h2, h3), tables, bullet points, and deep legal analysis.
      4. Ensure Google's 2024–2025 E-E-A-T guidelines are followed.
      5. Return ONLY the expanded HTML content. No JSON, no markdown code blocks, just raw HTML snippets that can be inserted into a Tiptap editor.
    `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Original Content:\n${content}` },
            ],
            stream: true,
        });

        const stream = new ReadableStream({
            async start(controller) {
                for await (const chunk of completion) {
                    const delta = chunk.choices[0]?.delta?.content || "";
                    if (delta) {
                        controller.enqueue(new TextEncoder().encode(delta));
                    }
                }
                controller.close();
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
            },
        });
    } catch (error) {
        console.error('Error expanding content:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

export const runtime = 'edge';