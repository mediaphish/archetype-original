/**
 * Upload Headshot
 * 
 * POST /api/operators/upload-headshot
 * 
 * Uploads a headshot image (PNG or JPG) for an Operator.
 * Returns the public URL of the uploaded headshot.
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import crypto from 'crypto';

export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: false // Disable body parsing for manual FormData handling
  }
};

// Helper function to parse multipart/form-data manually
async function parseMultipartFormData(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        
        if (!contentType.includes('multipart/form-data')) {
          return reject(new Error('Content-Type must be multipart/form-data'));
        }

        const boundary = contentType.split('boundary=')[1];
        if (!boundary) {
          return reject(new Error('Invalid multipart data - no boundary'));
        }

        const bodyString = buffer.toString('binary');
        
        // Extract type (should be 'headshot')
        const typeMatch = bodyString.match(/name="type"\r?\n\r?\n([^\r\n]+)/);
        const type = typeMatch ? typeMatch[1] : null;
        
        // Extract file data
        const fileMatch = bodyString.match(/name="file"; filename="([^"]+)"\r?\nContent-Type: ([^\r\n]+)\r?\n\r?\n([\s\S]+?)(?=\r?\n--|$)/);
        if (!fileMatch) {
          return reject(new Error('No file found in request'));
        }

        const fileName = fileMatch[1];
        const fileType = fileMatch[2];
        const fileData = fileMatch[3];

        resolve({
          type,
          file: {
            originalname: fileName,
            mimetype: fileType,
            buffer: Buffer.from(fileData, 'binary')
          }
        });
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Parse FormData manually
    const { type, file } = await parseMultipartFormData(req);

    if (type !== 'headshot') {
      return res.status(400).json({ ok: false, error: 'type must be "headshot"' });
    }

    if (!file) {
      return res.status(400).json({ ok: false, error: 'No file found in request' });
    }

    // Validate file type (PNG or JPG only)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype.toLowerCase())) {
      return res.status(400).json({ ok: false, error: 'File must be PNG or JPG' });
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.buffer.length > maxSize) {
      return res.status(400).json({ ok: false, error: 'File size must be less than 2MB' });
    }

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueFileName = `operators-headshots/${crypto.randomUUID()}.${fileExtension}`;
    
    // Check if bucket exists, create if not
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets.some(bucket => bucket.name === 'operators-headshots');
      
      if (!bucketExists) {
        const { error: createError } = await supabaseAdmin.storage.createBucket('operators-headshots', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png'],
          fileSizeLimit: 2097152 // 2MB
        });
        
        if (createError) {
          console.error('[UPLOAD_HEADSHOT] Failed to create bucket:', createError);
        }
      }
    } catch (bucketError) {
      console.error('[UPLOAD_HEADSHOT] Bucket check failed:', bucketError);
    }
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('operators-headshots')
      .upload(uniqueFileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('[UPLOAD_HEADSHOT] Storage error:', error);
      return res.status(500).json({ ok: false, error: `Storage upload failed: ${error.message}` });
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('operators-headshots')
      .getPublicUrl(uniqueFileName);

    return res.status(200).json({ 
      ok: true, 
      headshotUrl: publicUrlData.publicUrl,
      fileName: uniqueFileName
    });

  } catch (error) {
    console.error('[UPLOAD_HEADSHOT] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
