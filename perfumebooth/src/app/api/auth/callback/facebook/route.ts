import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "/";

  if (!code) {
    return NextResponse.redirect(new URL(`/auth?mode=signin&error=${encodeURIComponent("No authorization code received from Facebook.")}`, request.url));
  }

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.redirect(new URL(`/auth?mode=signin&error=${encodeURIComponent("Facebook Login is misconfigured on the server (missing App ID or Secret).")}`, request.url));
  }

  try {
    const redirectUri = `${request.nextUrl.origin}/api/auth/callback/facebook`;
    
    // Exchange authorization code for access token
    const tokenUrl = `https://graph.facebook.com/v16.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
    const tokenRes = await fetch(tokenUrl, { cache: "no-store" });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json();
      return NextResponse.redirect(new URL(`/auth?mode=signin&error=${encodeURIComponent(errData.error?.message || "Failed to exchange authorization code.")}`, request.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Send access token to Django backend to sign in
    const isDocker = process.env.WATCHPACK_POLLING === "true";
    const backendUrl = process.env.BACKEND_API_URL || (isDocker ? "http://django:8000" : "http://localhost:8000");

    const backendRes = await fetch(`${backendUrl}/api/auth/customer/social/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "facebook", token: accessToken }),
      cache: "no-store",
    });

    if (!backendRes.ok) {
      const errData = await backendRes.json();
      return NextResponse.redirect(new URL(`/auth?mode=signin&error=${encodeURIComponent(errData.detail || "Authentication with backend failed.")}`, request.url));
    }

    const authData = await backendRes.json();

    // Set authorization cookies
    const cookieStore = await cookies();
    cookieStore.set("customerAccessToken", authData.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    });

    cookieStore.set("customerRefreshToken", authData.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Redirect to the original return URL
    return NextResponse.redirect(new URL(state, request.url));
  } catch (error) {
    console.error("Facebook OAuth callback error:", error);
    return NextResponse.redirect(new URL(`/auth?mode=signin&error=${encodeURIComponent("An unexpected error occurred during login.")}`, request.url));
  }
}
