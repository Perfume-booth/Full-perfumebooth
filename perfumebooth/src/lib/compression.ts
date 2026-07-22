import { NextRequest } from "next/server";
import zlib from "zlib";

const MIN_COMPRESSION_SIZE = 1024; // 1 KB threshold

export function createCompressedResponse(
  data: any,
  request: NextRequest,
  status: number = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  const jsonString = JSON.stringify(data);
  const rawBuffer = Buffer.from(jsonString, "utf-8");

  // Check size threshold
  if (rawBuffer.length < MIN_COMPRESSION_SIZE) {
    return new Response(new Uint8Array(rawBuffer), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...extraHeaders,
      },
    });
  }

  const acceptEncoding = request.headers.get("accept-encoding") || "";
  let compressedBuffer: Buffer | null = null;
  let contentEncoding = "";

  // Check if it's already compressed (avoid double compression)
  const isAlreadyCompressed = 
    Object.keys(extraHeaders).some(k => k.toLowerCase() === "content-encoding");

  if (!isAlreadyCompressed) {
    if (acceptEncoding.includes("br")) {
      try {
        compressedBuffer = zlib.brotliCompressSync(rawBuffer);
        contentEncoding = "br";
      } catch (err) {
        console.error("Brotli compression failed:", err);
      }
    } else if (acceptEncoding.includes("gzip")) {
      try {
        compressedBuffer = zlib.gzipSync(rawBuffer);
        contentEncoding = "gzip";
      } catch (err) {
        console.error("Gzip compression failed:", err);
      }
    } else if (acceptEncoding.includes("deflate")) {
      try {
        compressedBuffer = zlib.deflateSync(rawBuffer);
        contentEncoding = "deflate";
      } catch (err) {
        console.error("Deflate compression failed:", err);
      }
    }
  }

  if (compressedBuffer && contentEncoding) {
    return new Response(new Uint8Array(compressedBuffer), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Encoding": contentEncoding,
        "Content-Length": compressedBuffer.length.toString(),
        "Vary": "Accept-Encoding",
        ...extraHeaders,
      },
    });
  }

  // Fallback to uncompressed response
  return new Response(new Uint8Array(rawBuffer), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": rawBuffer.length.toString(),
      ...extraHeaders,
    },
  });
}
