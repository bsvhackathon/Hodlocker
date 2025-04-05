import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest
) {
  // Get the URL from the request
  const { searchParams } = new URL(request.url);
  
  // Get the txid from the search params
  const txid = searchParams.get('txid');

  if (!txid || typeof txid !== 'string') {
    return NextResponse.json({ error: 'Invalid txid' }, { status: 400 });
  }

  try {
    // Use WhatsonChain API to get OP_RETURN data
    const response = await fetch(`https://api.whatsonchain.com/v1/bsv/main/tx/${txid}/opreturn`);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch from WhatsonChain: ${response.statusText}` }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ image: null });
    }

    // Look specifically for the output with n=1 which contains the image
    const imageOutput = data.find(output => output.n === 1);
    if (!imageOutput || !imageOutput.hex || !imageOutput.hex.startsWith('006a')) {
      return NextResponse.json({ image: null });
    }
    
    // Convert hex to string
    const hexData = imageOutput.hex.substring(4); // Remove the '006a' prefix
    const bData = Buffer.from(hexData, 'hex').toString('utf8');
    
    // Match B protocol image format
    const matches = bData.match(/B (.*?) (image\/\w+) base64/);
    if (matches && matches.length >= 3) {
      const [_, base64Data, mediaType] = matches;

      return NextResponse.json({ 
        image: `data:${mediaType};base64,${base64Data}` 
      });
    }
    
    return NextResponse.json({ image: null });
  } catch (error) {
    console.error('Error fetching attachment:', error);
    return NextResponse.json(
      { error: 'Failed to process image data' }, 
      { status: 500 }
    );
  }
}