import { supabase } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

/**
 * Mesajın yanıt süresini güncelleyen API endpoint
 */
export async function POST(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const { messageId } = params;
    const { response_time } = await request.json();

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    if (response_time === undefined) {
      return NextResponse.json({ error: 'Response time is required' }, { status: 400 });
    }

    // Supabase'deki messages tablosunu güncelle
    const { error } = await supabase
      .from('messages')
      .update({ response_time })
      .eq('id', messageId);

    if (error) {
      console.error('Error updating response time:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in update-time API:', error);
    return NextResponse.json(
      { error: 'Failed to update response time' },
      { status: 500 }
    );
  }
} 