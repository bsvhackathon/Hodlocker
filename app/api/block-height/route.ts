
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/chain/info');
    const data = await response.json();
    
    return NextResponse.json({ blocks: data.blocks });
  } catch (error) {
    console.error('Error fetching block height:', error);
    return NextResponse.json(
      { error: 'Failed to fetch block height' },
      { status: 500 }
    );
  }
}