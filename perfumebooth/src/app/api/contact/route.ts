

import { NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
    if (isRateLimited(ip, 5, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
    

    const { name, email, phone, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required fields.' },
        { status: 400 }
      );
    }

    // 1. Durably store submission in Django PostgreSQL database
    const isDocker = process.env.WATCHPACK_POLLING === "true";
    const API_URL = process.env.NEXT_PUBLIC_API_URL || (isDocker ? "http://django:8000" : "http://localhost:8000");
    let savedSubmissionId: string | undefined;

    try {
      const dbRes = await fetch(`${API_URL}/api/cms/contact/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": ip,
        },
        body: JSON.stringify({ name, email, phone, message }),
      });
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        savedSubmissionId = dbData.id;
      }
    } catch (dbErr) {
      console.error("Failed to persist contact submission in Django:", dbErr);
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        message: 'Submission received and saved successfully.',
        id: savedSubmissionId,
      });
    }

    // Default recipient or configured recipient
    const recipient = process.env.CONTACT_RECIPIENT_EMAIL || 'online@beverly-in.com';
    // Resend free tier/sandbox domain requires using onboarding@resend.dev unless verified
    const sender = process.env.CONTACT_SENDER_EMAIL || 'onboarding@resend.dev';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `Contact Form <${sender}>`,
        to: [recipient],
        reply_to: email,
        subject: `New Inquiry from ${name} via PerfumeBooth`,
        html: `
          <h2>New Contact Inquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error from Resend API:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to send email via Resend.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Inquiry email sent successfully.',
      id: data.id,
    });
  } catch (error: any) {
    console.error('Contact form handler error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
