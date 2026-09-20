// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [items, setItems] = useState([]);
  const [textInput, setTextInput] = useState('');

  const fetchItems = async () => {
    const supabase = getSupabase();
    const { data } = await supabase.from('clipboard').select('*').order('created_at', { ascending: false });
    if (data) setItems(data);
  };

  useEffect(() => {
    fetchItems();
    const supabase = getSupabase();
    const channel = supabase.channel('realtime clipboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clipboard' }, (payload) => {
        setItems((prev) => [payload.new, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const sendTextToPhone = async () => {
    if (!textInput) return;
    const supabase = getSupabase();
    await supabase.from('clipboard').insert([{ item_type: 'text', content: textInput }]);
    
    // Sends LINE notification to your phone
    await fetch('/api/send', {
      method: 'POST',
      body: JSON.stringify({ text: textInput })
    });
    setTextInput('');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">My Remote Clipboard</h1>
        
        <div className="flex gap-2 mb-8">
          <input 
            type="text" 
            className="border p-3 flex-1 rounded shadow-sm bg-white" 
            placeholder="Type a note to send to your phone..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <button onClick={sendTextToPhone} className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded shadow-sm">
            Send to Phone
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {items.map(item => (
            <div key={item.id} className="p-4 border rounded shadow-sm bg-white">
              {item.item_type === 'text' && <p className="text-lg whitespace-pre-wrap">{item.content}</p>}
              {item.item_type === 'image' && <img src={item.file_url} alt="clipboard" className="max-w-full h-auto rounded mt-2" />}
              {item.item_type === 'file' && <a href={item.file_url} target="_blank" className="text-blue-500 font-bold underline">📎 Download File</a>}
              <span className="text-xs text-gray-400 block mt-3">
                {new Date(item.created_at).toLocaleString()}
              </span>
            </div>
          ))}
          {items.length === 0 && <p className="text-gray-500">Your clipboard is empty. Send something from LINE!</p>}
        </div>
      </div>
    </div>
  );
}