const secretKey = process.env.ADMIN_JWT_SECRET || "super-secure-fallback-secret-key-1234567890";

export async function signToken(username: string, expiresInSeconds = 86400): Promise<string> {
  const expires = Date.now() + expiresInSeconds * 1000;
  const payload = `${username}.${expires}`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(payload)
  );
  
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${payload}.${signatureHex}`;
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [username, expiresStr, signatureHex] = parts;
    const expires = parseInt(expiresStr);
    
    if (Date.now() > expires) return false;
    
    const payload = `${username}.${expiresStr}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(payload)
    );
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedSignatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return signatureHex === expectedSignatureHex;
  } catch (err) {
    console.error("[AUTH] Token verification error:", err);
    return false;
  }
}
