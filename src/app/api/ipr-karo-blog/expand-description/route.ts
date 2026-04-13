import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.HELLO_DROP_CHOO,
});

export async function POST(request: NextRequest) {
    try {
        const { currentDescription, expansionSubtopics, primaryKeyword } = await request.json();

        if (!currentDescription) {
            return NextResponse.json({ error: 'Current description is required' }, { status: 400 });
        }

        if (!expansionSubtopics) {
            return NextResponse.json({ error: 'Expansion subtopics are required' }, { status: 400 });
        }

        if (!process.env.HELLO_DROP_CHOO) {
            return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
        }

        const systemPrompt = `You are an expert SEO and AEO legal content strategist for IPR Karo (www.iprkaro.com).
        Your task is to significantly expand the existing blog description by adding NEW, highly detailed sections based on the provided subtopics.
        
        Guidelines:
        1. STRONGLY IMPORTANT: Return ONLY pure HTML tags. Do NOT wrap the response in markdown code blocks.
        2. DO NOT include any "FAQs" or "Frequently Asked Questions" sections. These are handled separately in the database.
        3. Maintain the existing HTML structure and professional tone.
        4. Seamlessly integrate the new content into the current description, inserting new H2/H3/H4 sections where they fit best.
        5. Follow Google 2025 SEO and E-E-A-T guidelines.
        6. Include internal links to these specific pages:
           - https://www.iprkaro.com/
           - https://www.iprkaro.com/our-services
           - https://www.iprkaro.com/our-services/trademark-registration
           - https://www.iprkaro.com/our-services/copyright-registration
           - https://www.iprkaro.com/our-services/patent-registration
        7. Use <h2>, <h3>, <h4>, <p>, <ul>, <li>, and <table> tags as appropriate.
        8. The target word count for the entire expanded blog is 4000-5000 words. Be extremely detailed, adding deep legal analysis, step-by-step procedures, and case references.
        9. Do NOT replace the existing content unless necessary for flow; focus on ADDING massive value and length.
        
        Return the updated description as a pure HTML string.`;

        const userPrompt = `Primary Keyword: ${primaryKeyword || 'Not provided'}
        Current Description: ${currentDescription}
        
        Expansion Subtopics/Instructions: ${expansionSubtopics}
        
        Please provide the fully expanded content (aiming for 4000+ words total) as pure HTML.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
        });

        let expandedContent = completion.choices[0].message.content;

        if (!expandedContent) {
            throw new Error('No content returned from OpenAI');
        }

        // Sanitize response: Strip markdown code blocks if present
        expandedContent = expandedContent.replace(/^```html\s*/i, '').replace(/\s*```$/i, '').trim();
        // Remove individual backticks if they somehow persist
        if (expandedContent.startsWith('```') && expandedContent.endsWith('```')) {
            expandedContent = expandedContent.substring(3, expandedContent.length - 3).trim();
        }

        return NextResponse.json({ expandedDescription: expandedContent });
    } catch (error: any) {
        console.error('Error in expand-description API:', error);
        return NextResponse.json({ error: error.message || 'Failed to expand description' }, { status: 500 });
    }
}