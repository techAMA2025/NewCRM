import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    try {
        const { startDate, topic, userPrompt } = await request.json();

        const apiKey = process.env.HELLO_DROP_CHOO;
        if (!apiKey) {
            return NextResponse.json(
                { success: false, message: 'OpenAI API key not configured' },
                { status: 500 }
            );
        }

        if (!startDate || !topic || !Array.isArray(topic) || topic.length === 0) {
            return NextResponse.json(
                { success: false, message: 'startDate and topic[] are required' },
                { status: 400 }
            );
        }

        let prompt = `You are a legal tips notification content generator for a legal services app called AMA Legal Solutions.

TASK: Generate EXACTLY 30 push notifications — no more, no less. Output a JSON array with exactly 30 objects.

USER CUSTOM INSTRUCTIONS/CONTEXT:
${userPrompt ? `CRITICAL: The user has provided the following specific instructions OR content to base the notifications on. JUDGE this text and generate notifications accordingly:
"""
${userPrompt}
"""` : 'Generate 30 unique, high-value legal tip notifications for general users, focusing on loan settlement, debt relief, and business legal protection.'}

CONSTRAINTS:
- "title" must be 30 characters or fewer (including spaces). 
- "body" must be 150 characters or fewer (including spaces). Make it informative yet concise.
- Each notification must be unique and provide genuine legal value.
- Titles should be catchy and engaging to encourage users to open the app.
- Use simple English accessible to Indian users.

CRITICAL: You MUST return exactly 30 items. Count them. The array length must be 30. If you return fewer than 30, you have failed.

Respond with ONLY a valid JSON array of 30 objects. Each object has exactly two keys: "title" (string) and "body" (string). No markdown, no code fences, no explanation — just the raw JSON array.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a precise JSON generator. You return only valid JSON arrays with no markdown formatting or extra text.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.8,
                max_tokens: 8000,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('OpenAI API error:', errText);
            return NextResponse.json(
                { success: false, message: 'Failed to generate notifications from AI', error: errText },
                { status: 500 }
            );
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content?.trim();

        if (!rawContent) {
            return NextResponse.json(
                { success: false, message: 'Empty response from AI' },
                { status: 500 }
            );
        }

        // Clean up potential markdown code fences
        let cleanedContent = rawContent;
        if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        let notifications: { title: string; body: string }[];
        try {
            notifications = JSON.parse(cleanedContent);
        } catch {
            console.error('Failed to parse AI response:', cleanedContent);
            return NextResponse.json(
                { success: false, message: 'AI returned invalid JSON', raw: cleanedContent },
                { status: 500 }
            );
        }

        if (!Array.isArray(notifications) || notifications.length === 0) {
            return NextResponse.json(
                { success: false, message: 'AI returned empty or invalid array' },
                { status: 500 }
            );
        }

        // Validate and trim to constraints
        let validated = notifications.slice(0, 30).map((n, i) => ({
            day: i + 1,
            title: (n.title || `Legal Tip #${i + 1}`).slice(0, 30),
            body: (n.body || 'Stay informed about your legal rights.').slice(0, 150),
        }));

        // Pad to exactly 30 if AI returned fewer
        const fallbackTips = [
            { title: 'Know Your Rights Today', body: 'Understanding your legal rights is the first step to protecting yourself. Consult a lawyer for personalized guidance on your situation.' },
            { title: 'Settle Debt Smartly', body: 'Loan settlement can reduce your debt burden significantly. Always negotiate with your bank before agreeing to any terms or conditions.' },
            { title: 'Protect Your Brand Name', body: 'Trademark registration protects your brand identity. File early to secure exclusive rights to your business name and logo in India.' },
            { title: 'Facing EMI Troubles?', body: 'If you are unable to pay EMIs, contact your bank immediately. Restructuring options may be available under RBI guidelines for borrowers.' },
            { title: 'Protect Your IP', body: 'Intellectual property is your competitive advantage. From patents to copyrights, ensure you register and protect your creative work today.' },
            { title: 'Free Legal Aid Tip', body: 'Free legal aid is available to eligible citizens under the Legal Services Authority Act. Check your local legal aid office for assistance.' },
            { title: 'OTS Settlement Benefits', body: 'One Time Settlement with banks can help you clear outstanding loans at a reduced amount. Seek legal advice before signing any OTS agreement.' },
            { title: 'Basic Contract Rules', body: 'Always read contracts carefully before signing. Key clauses like termination, liability, and dispute resolution can impact your rights.' },
        ];
        while (validated.length < 30) {
            const fb = fallbackTips[validated.length % fallbackTips.length];
            validated.push({
                day: validated.length + 1,
                title: fb.title.slice(0, 30),
                body: fb.body.slice(0, 150),
            });
        }

        return NextResponse.json({
            success: true,
            notifications: validated,
            count: validated.length,
        });

    } catch (error: any) {
        console.error('Error generating bulk notifications:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}
