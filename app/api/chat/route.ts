import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { buildTableSchemas } from '@/lib/schema-builder';
import type { ChatRequest } from '@/lib/types/api';

export async function POST(req: NextRequest) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const { messages, dashboardContext, mode } = (await req.json()) as ChatRequest;

    const tableSchemas = await buildTableSchemas();

    const systemPrompt = buildSystemPrompt(
      tableSchemas,
      dashboardContext?.widgets
    );

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    });

    const rawText = response.choices[0]?.message?.content || '';

    const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        // Extract text outside the JSON block as the message
        const textOutside = rawText.replace(/```json\n?[\s\S]*?\n?```/, '').trim();
        return NextResponse.json({
          message: parsed.message || textOutside || '완료되었습니다.',
          actions: parsed.actions || [],
        });
      } catch {
        // If JSON parsing fails, return as plain message
      }
    }

    return NextResponse.json({ message: rawText, actions: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
