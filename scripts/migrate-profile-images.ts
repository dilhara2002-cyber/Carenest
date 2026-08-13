/**
 * Migration script: Convert existing base64 profile images to files on disk.
 *
 * Usage:  npx tsx scripts/migrate-profile-images.ts
 *
 * This script:
 * 1. Finds all users whose profileImage starts with "data:" (base64 data URLs)
 * 2. Decodes the base64 data and saves it as a file in public/uploads/profiles/
 * 3. Updates the database column to store the URL path instead
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'profiles');

// Map common MIME types to file extensions
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

async function main() {
  console.log('🔍 Scanning for base64 profile images...\n');

  // Ensure upload directory exists
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`📁 Created directory: ${UPLOAD_DIR}\n`);
  }

  // Find all users with base64 profile images
  const users = await prisma.user.findMany({
    where: {
      profileImage: {
        startsWith: 'data:',
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      profileImage: true,
    },
  });

  if (users.length === 0) {
    console.log('✅ No base64 profile images found. Nothing to migrate.');
    return;
  }

  console.log(`Found ${users.length} user(s) with base64 profile images:\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      const dataUrl = user.profileImage!;

      // Parse the data URL: data:<mime>;base64,<data>
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        console.log(`  ⚠️  ${user.email} — invalid data URL format, skipping`);
        errorCount++;
        continue;
      }

      const mimeType = match[1];
      const base64Data = match[2];
      const ext = MIME_TO_EXT[mimeType] || '.png';

      // Generate filename
      const filename = `${user.id}-migrated${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      // Decode and save
      const buffer = Buffer.from(base64Data, 'base64');
      writeFileSync(filepath, buffer);

      // Update database
      const urlPath = `/uploads/profiles/${filename}`;
      await prisma.user.update({
        where: { id: user.id },
        data: { profileImage: urlPath },
      });

      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
      console.log(`  ✅ ${user.email} — saved ${sizeMB}MB as ${filename}`);
      successCount++;
    } catch (error) {
      console.log(`  ❌ ${user.email} — error: ${error instanceof Error ? error.message : String(error)}`);
      errorCount++;
    }
  }

  console.log(`\n────────────────────────────────`);
  console.log(`Migration complete!`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors:  ${errorCount}`);
  console.log(`────────────────────────────────`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Migration failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
