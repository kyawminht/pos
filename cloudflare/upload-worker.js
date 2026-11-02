/**
 * POS image-upload Worker for Cloudflare R2 (free tier).
 *
 * POST /  (multipart file body, header x-pos-upload-token: <UPLOAD_TOKEN>)
 *   -> { "url": "<PUBLIC_BASE>/<uuid>.jpg" }
 *
 * Wrangler secrets/binds:
 *   PRODUCT_IMAGES  R2 bucket binding (read/write)
 *   UPLOAD_TOKEN    long random shared token (matches VITE_R2_UPLOAD_TOKEN)
 *   PUBLIC_BASE     public GET base URL of the bucket (r2.dev or custom domain),
 *                   e.g. https://pub-xxxxxxxx.r2.dev
 */
interface Env {
  PRODUCT_IMAGES: R2Bucket
  UPLOAD_TOKEN: string
  PUBLIC_BASE: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const token = request.headers.get('x-pos-upload-token')
    if (!env.UPLOAD_TOKEN || token !== env.UPLOAD_TOKEN) {
      return new Response('Forbidden', { status: 403 })
    }

    const ct = request.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) {
      return new Response('Only images allowed', { status: 415 })
    }

    // 10MB cap (defensive; client already compresses to ~50-120KB)
    const contentLength = Number(request.headers.get('content-length') || '0')
    if (contentLength > 10 * 1024 * 1024) {
      return new Response('Image too large', { status: 413 })
    }

    const filename = `${crypto.randomUUID()}.jpg`
    await env.PRODUCT_IMAGES.put(filename, request.body, {
      httpMetadata: { contentType: 'image/jpeg' },
    })

    const base = env.PUBLIC_BASE.replace(/\/$/, '')
    return Response.json({ url: `${base}/${filename}` })
  },
}
