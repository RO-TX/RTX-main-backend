import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { ApiError } from './ApiError';

export const s3Configured = Boolean(
  env.AWS_REGION && env.AWS_S3_BUCKET && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY,
);

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!s3Configured) {
    throw ApiError.badRequest('File storage is not configured (missing AWS env vars)');
  }
  if (!client) {
    client = new S3Client({
      region: env.AWS_REGION!,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

/** Uploads a buffer to S3 under `folder/` with a random filename; returns the public URL. */
export async function uploadToS3(params: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  folder: string;
}): Promise<string> {
  const ext = params.originalName.split('.').pop()?.toLowerCase() || 'bin';
  const key = `${params.folder}/${randomUUID()}.${ext}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET!,
      Key: key,
      Body: params.buffer,
      ContentType: params.mimeType,
    }),
  );

  return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

/** Deletes an object given its public URL (no-op if the URL isn't from our bucket). */
export async function deleteFromS3(url: string): Promise<void> {
  const prefix = `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/`;
  if (!url.startsWith(prefix)) return;
  const key = url.slice(prefix.length);

  await getClient().send(new DeleteObjectCommand({ Bucket: env.AWS_S3_BUCKET!, Key: key }));
}
