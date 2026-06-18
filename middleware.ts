import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if target is admin pages or APIs (excluding the login endpoint)
  const isAdminPath = path.startsWith("/admin");
  const isAdminApiPath = path.startsWith("/api/admin") && path !== "/api/admin/login";

  if (isAdminPath || isAdminApiPath) {
    const sessionCookie = request.cookies.get("admin_session")?.value;
    const isValid = await verifyToken(sessionCookie);

    if (!isValid) {
      // API endpoints block with 401 JSON
      if (isAdminApiPath) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
      }
      
      // Page endpoints redirect to the login screen
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/admin",
    "/api/admin/:path*"
  ]
};
