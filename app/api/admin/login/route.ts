import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (username === "ejaj" && password === "common5005") {
      const token = await signToken(username);
      
      const response = NextResponse.json({ success: true });
      response.cookies.set("admin_session", token, {
        httpOnly: true,
        secure: true, // enforce secure HTTPS transmission always
        sameSite: "strict",
        path: "/",
        maxAge: 86400 // 1 day session duration
      });
      
      return response;
    }

    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
