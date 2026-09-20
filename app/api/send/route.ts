// @ts-nocheck
import { NextResponse } from 'next/server';
import * as line from '@line/bot-sdk';

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    
    // Sends message directly back to your LINE app
    await client.pushMessage({
      to: process.env.LINE_USER_ID!,
      messages: [{ type: 'text', text: `💻 Note from PC:\n\n${text}` }]
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}