import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client: S3Client | null = null;
let _available = false;

function getS3Client(): S3Client | null {
  if (s3Client) return s3Client;

  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET_NAME;
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !bucket || !accessKey || !secretKey) {
    return null;
  }

  s3Client = new S3Client({ region });
  _available = true;
  return s3Client;
}

export function isS3Available(): boolean {
  return _available || !!(
    process.env.AWS_REGION &&
    process.env.S3_BUCKET_NAME &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}

export function getBucketName(): string | null {
  return process.env.S3_BUCKET_NAME ?? null;
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 300,
): Promise<string> {
  const client = getS3Client();
  if (!client) {
    throw new Error("S3 is not configured — set AWS_REGION, S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY");
  }

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function deleteS3Object(key: string): Promise<void> {
  const client = getS3Client();
  if (!client) {
    throw new Error("S3 is not configured — set AWS_REGION, S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY");
  }

  const command = new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
  });

  await client.send(command);
}
