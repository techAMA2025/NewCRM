
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
      Act as a professional SEO and AEO expert and legal content strategist for AMA Legal Solutions.
      
      **Goal**: Expand the provided HTML content while maintaining high quality, SEO optimization, and legal authority. Aim for a total word count of 3000-5000+ words.
      
      **Requirements**:
      - Follow Google's 2026 SEO and E-E-A-T guidelines strictly.
      - Follow the user's specific expansion instructions: [${prompt || 'Make it more detailed and exhaustive'}].
      - Maintain a professional, authoritative, and human tone.
      - Deepen the content with actionable legal advice, case references, and statistics.
      - Use <h2>, <h3>, <h4>, <ul>, <ol>, <li>, and <table> for clarity and structure.
      - **Internal Linking**: You MUST naturally integrate mentions and links to the following AMA Legal Solutions services within the HTML content where relevant:
        - https://www.amalegalsolutions.com/services/banking-and-finance
        - https://www.amalegalsolutions.com/services/loan-settlement
        - https://www.amalegalsolutions.com/services/intellectual-property-rights
        - https://www.amalegalsolutions.com/services/entertainment
        - https://www.amalegalsolutions.com/services/real-estate
        - https://www.amalegalsolutions.com/services/criminal-law
        - https://www.amalegalsolutions.com/services/corporate
        - https://www.amalegalsolutions.com/services/arbitration
        - https://www.amalegalsolutions.com/services/cyber
        - https://www.amalegalsolutions.com/services/civil
        - https://www.amalegalsolutions.com/services/drafting
        - https://www.amalegalsolutions.com/services/litigation
      - **AEO Optimization**: Ensure clear answers to user intent suitable for Google snippets.
      - **Humanization**: Write in a professional, authoritative, and humanized tone. Do things to ensure it is detected by search engines as high-quality, authoritative, human content.

      **Return ONLY the expanded HTML content**. No JSON, no markdown code blocks, just raw HTML snippets suitable for a Tiptap editor.
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