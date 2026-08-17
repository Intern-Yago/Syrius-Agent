import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";

let s3ClientInstance: S3Client | null = null;

export function getS3Client(): S3Client {
  if (s3ClientInstance) {
    return s3ClientInstance;
  }

  s3ClientInstance = new S3Client({
    endpoint: env.STORAGE_ENDPOINT,
    region: env.STORAGE_REGION,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY,
      secretAccessKey: env.STORAGE_SECRET_KEY,
    },
    // R2 e MinIO usam pathStyle
    forcePathStyle: true,
  });

  return s3ClientInstance;
}

export async function ensureBucket(): Promise<void> {
  const client = getS3Client();
  const bucket = env.STORAGE_BUCKET;

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log(`📦 Bucket "${bucket}" criado no storage.`);
    } catch (createErr) {
      console.warn(`Aviso ao verificar bucket "${bucket}":`, createErr);
    }
  }
}

export async function uploadImageBuffer(
  buffer: Buffer,
  objectKey: string,
  contentType = "image/png"
): Promise<string> {
  await ensureBucket();
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return objectKey;
}

export async function getImageUrl(
  objectKey: string | null,
  expiresInSeconds = 86400 // 24 horas para dar tempo de postar no Instagram
): Promise<string | null> {
  if (!objectKey) return null;

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: objectKey,
  });

  return getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });
}

export async function imageExists(objectKey: string): Promise<boolean> {
  try {
    const client = getS3Client();
    await client.send(
      new HeadObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: objectKey,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export async function downloadImageBuffer(objectKey: string): Promise<Buffer> {
  const client = getS3Client();
  const res = await client.send(
    new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: objectKey,
    })
  );
  const byteArray = await res.Body?.transformToByteArray();
  if (!byteArray) throw new Error(`Falha ao ler objeto ${objectKey}`);
  return Buffer.from(byteArray);
}

export async function deleteImage(objectKey: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: objectKey,
    })
  );
}
