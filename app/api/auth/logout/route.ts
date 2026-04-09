import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth_code');
  response.cookies.delete('device_id');
  response.cookies.delete('code_usage');
  return response;
}
