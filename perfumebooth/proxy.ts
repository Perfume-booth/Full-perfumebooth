import { type NextRequest, NextResponse } from "next/server";

/**
 * Proxy handles page authentication rules, personalization, and guards (formerly middleware).
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Personalize the homepage based on a 'viewed_category' cookie
  const viewedCategory = request.cookies.get('viewed_category')?.value;

  if (viewedCategory) {
    // Inject this into request headers for Server Components to read
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-interest', viewedCategory);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return response;
}

export const config = {
  // Run proxy on all paths except static files, service workers, images, APIs, etc.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|sw.js|workbox-.*\\.js|images|assets).*)",
  ],
};
