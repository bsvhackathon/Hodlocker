// app/api/network-stats/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/chain/info');
    const data = await response.json();
    
    // Calculate hashrate from difficulty
    // Bitcoin hashrate formula: hashrate = difficulty * 2^32 / 600
    const difficulty = data.difficulty;
    const hashrate = (difficulty * Math.pow(2, 32)) / 600;
    
    return NextResponse.json({
      chainInfo: {
        difficulty: difficulty,
        hashrate: hashrate
      }
    });
  } catch (error) {
    console.error('Error fetching network stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network stats' },
      { status: 500 }
    );
  }
}