export function sanitizeInput(input) {
  if (typeof input !== "string") return input;
  // Simple DOMPurify alternative since we just want to avoid simple script injections in API payloads
  return input
    .replace(/<script[^>]*?>.*?<\/script>/gi, '')   
    .replace(/<[^>]*?onerror\s*=\s*(['"]).*?\1[^>]*?>/gi, '') 
    .replace(/<[^>]*?javascript:.*?[^>]*?>/gi, '');  
}

// Recursively sanitize nested objects
export function sanitizeObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  } else if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return sanitizeInput(obj);
}

// Higher Order Function to sanitize API JSON Payload (XSS Mitigation)
export function withSanitization(handler) {
  return async function (request) {
    // We clone because reading .json() consumes the stream
    const clonedReq = request.clone();
    try {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
         const body = await clonedReq.json();
         const sanitizedBody = sanitizeObject(body);
         
         // Override .json() method for the downstream handler
         request.json = async () => sanitizedBody;
      }
    } catch (e) {
      // Ignored: fallback to original un-overriden request structure
    }
    return handler(request);
  };
}

// Higher Order Function to harden File Uploads
export function withUploadHardening(handler) {
  return async function (request) {
    const cloned = request.clone();
    try {
      // Check multipart/form-data sizes and signatures
      const formData = await cloned.formData();
      const files = formData.getAll("files");
      
      for (const file of files) {
         if (!(file instanceof File)) continue;
         
         // 1. Validasi File Type (MIME) - Blokir SVG/HTML/JS
         const validTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
         if (!validTypes.includes(file.type)) {
           return Response.json({ error: "Upload ditolak. Hanya format standard image (JPEG, PNG, WEBP, AVIF) yang diijinkan." }, { status: 400 });
         }

         // 2. Limit Size 5 MB
         if (file.size > 5 * 1024 * 1024) {
           return Response.json({ error: "Ukuran file maksimum 5MB." }, { status: 400 });
         }
      }
    } catch(e) {
       // Ignore if not formData, let downstream error handler catch it
    }
    
    return handler(request);
  }
}
