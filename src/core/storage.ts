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

import fs from "node:fs";
import path from "node:path";

export async function saveImageLocally(
  buffer: Buffer,
  relativePath: string
): Promise<string> {
  const fullPath = path.resolve(process.cwd(), "output", "images", relativePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, buffer);
  return `images/${relativePath.replace(/\\/g, "/")}`;
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
  objectOrLocalPath: string | null,
  expiresInSeconds = 86400
): Promise<string | null> {
  if (!objectOrLocalPath) return null;

  if (objectOrLocalPath.startsWith("data:") || objectOrLocalPath.startsWith("http://") || objectOrLocalPath.startsWith("https://")) {
    return objectOrLocalPath;
  }

  // Verifica se existe no disco local (output/images/... ou caminho relativo)
  const cleanPath = objectOrLocalPath.replace(/^images\//, "").replace(/^output\/images\//, "");
  const localCandidates = [
    path.resolve(process.cwd(), "output", "images", cleanPath),
    path.resolve(process.cwd(), "output", "images", objectOrLocalPath),
    path.resolve(process.cwd(), objectOrLocalPath),
  ];

  for (const cand of localCandidates) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      try {
        const fileBuffer = fs.readFileSync(cand);
        const mime = cand.endsWith(".jpg") || cand.endsWith(".jpeg") ? "image/jpeg" : "image/png";
        return `data:${mime};base64,${fileBuffer.toString("base64")}`;
      } catch {
        // fallback
      }
    }
  }

  // Fallback: se não estiver no disco local, busca URL assinada do Cloudflare R2
  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: objectOrLocalPath,
    });

    return await getSignedUrl(client, command, {
      expiresIn: expiresInSeconds,
    });
  } catch {
    return null;
  }
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
