// @ts-nocheck
import { NextResponse } from 'next/server';
import * as line from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

const blobClient = new line.messagingApi.MessagingApiBlobClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // LINE verification
    if (body.events.length === 0) return NextResponse.json({ message: 'ok' });

    const event = body.events[0];
    
    if (event.type === 'message') {
      if (event.message.type === 'text') {
        // Handle Text Message
        await supabase.from('clipboard').insert([
          { item_type: 'text', content: event.message.text }
        ]);
      } else if (event.message.type === 'image' || event.message.type === 'file') {
        // Handle Image or File Upload
        const stream = await blobClient.getMessageContent(event.message.id);
        const chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        
        const ext = event.message.type === 'image' ? 'jpg' : 'bin';
        const fileName = `${Date.now()}-${event.message.id}.${ext}`;
        
        await supabase.storage
          .from('clipboard-files')
          .upload(fileName, buffer, {
            contentType: event.message.type === 'image' ? 'image/jpeg' : 'application/octet-stream'
          });
          
        const { data } = supabase.storage.from('clipboard-files').getPublicUrl(fileName);
        
        await supabase.from('clipboard').insert([
          { item_type: event.message.type, file_url: data.publicUrl }
        ]);
      }
    }
    return NextResponse.json({ message: 'success' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'error' }, { status: 500 });
  }
}