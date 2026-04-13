import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.HELLO_DROP_CHOO,
});

export async function POST(request: NextRequest) {
    try {
        const { primaryKeyword, secondaryKeyword } = await request.json();

        if (!primaryKeyword) {
            return NextResponse.json({ error: 'Primary keyword is required' }, { status: 400 });
        }

        if (!process.env.HELLO_DROP_CHOO) {
            return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
        }

        const systemPrompt = `Act as a professional SEO and AEO expert and legal content strategist. Create a fully human-written, SEO-optimized blog article for IPR Karo (www.iprkaro.com) following Google 2025 SEO and E-E-A-T guidelines.

    Requirements:
    1. Headings Structure: 
       - H1: Blog title with the primary keyword.
       - H2: Main sections covering key legal aspects, practical tips, and solutions. Include the primary keyword in H2.
       - H3/H4: Subtopics, examples, step-by-step guidance, and case studies. Include primary/secondary keywords naturally.
    2. Introduction: 2–3 paragraphs mentioning the primary keyword at least twice, hooking the reader, and explaining the topic.
    3. Content: 
       - 4000+ words of structured, high-quality content. Professional, authoritative, human tone.
       - Include actionable legal advice, examples, case references, and statistics where relevant.
       - Use bullet points, numbered lists, and tables for clarity.
       - Include internal links to these pages naturally within the content where relevant:
         * https://www.iprkaro.com/
         * https://www.iprkaro.com/about-us
         * https://www.iprkaro.com/our-services
         * https://www.iprkaro.com/our-services/trademark-registration
         * https://www.iprkaro.com/our-services/copyright-registration
         * https://www.iprkaro.com/our-services/patent-registration
         * https://www.iprkaro.com/resources
         * https://www.iprkaro.com/contact-us
       - Include external links to authoritative government/legal sites if needed.
    4. Conclusion: 2–3 paragraphs summarizing key points and including a strong call-to-action to contact IPR Karo.
    5. FAQs Section: Include at least 8–10 FAQs answering common questions related to the primary keyword.
    6. Meta Tags: 
       - Meta Title (60–70 characters) with primary keyword.
       - Meta Description (150–160 characters) with primary keyword.
    7. AEO Optimization: Clear answers to user intent suitable for Google snippets. Structured content for featured answers and easy readability.
    8. Additional Elements: Suggest infographics, tables, or visual aids to enhance readability and engagement.
    9. STRONGLY IMPORTANT: 
       - Return ONLY pure HTML tags for the description field.
       - DO NOT include the "FAQs" or "Frequently Asked Questions" section within the 'description' (HTML) field. FAQs must ONLY be provided in the 'faqs' JSON array.
       - The 'description' must be extremely comprehensive, aiming for 4000+ words of deep legal insight and analysis. Split the content into many detailed H2, H3, and H4 subsections to reach this length.

    The response must be in JSON format and include:
    - title: The H1 title.
    - subtitle: A descriptive subtitle with keywords.
    - description: The main blog content in HTML format (use <h2>, <h3>, <h4>, <p>, <ul>, <li>, <table>, <a> tags).
    - metaTitle: SEO meta title.
    - metaDescription: SEO meta description.
    - slug: URL-friendly slug.
    - faqs: An array of objects with { question, answer }.
    - reviews: An array of objects with { name, rating, review }. Include 3-5 realistic reviews with Indian names.
    - suggestedImagePrompt: A detailed visual description for image generation.

    Focus on practical, helpful advice for Indian businesses and entrepreneurs. Use a professional yet accessible tone.`;

        const userPrompt = `Primary Keyword: ${primaryKeyword}
    Secondary Keyword: ${secondaryKeyword || 'None provided'}
    
    Please generate a high-quality blog post with 4000+ words.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
        });

        const rawContent = completion.choices[0].message.content;

        if (!rawContent) {
            throw new Error('No content returned from OpenAI');
        }

        const data = JSON.parse(rawContent);

        // Sanitize description: Strip markdown code blocks if present
        if (data.description) {
            data.description = data.description.replace(/^```html\s*/i, '').replace(/\s*```$/i, '').trim();
            if (data.description.startsWith('```') && data.description.endsWith('```')) {
                data.description = data.description.substring(3, data.description.length - 3).trim();
            }
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error in generate-article API:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate blog content' }, { status: 500 });
    }
}