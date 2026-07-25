import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} environment variable is required for S3 operations. ` +
      `Set it in your .env file or environment.`,
    );
  }
  return value;
}

const region = requireEnv("AWS_REGION");
const bucket = requireEnv("S3_BUCKET_NAME");
requireEnv("AWS_ACCESS_KEY_ID");
requireEnv("AWS_SECRET_ACCESS_KEY");

export const s3 = new S3Client({
  region,
});

export function getBucketName(): string {
  return bucket;
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 300,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3, command, { expiresIn });
}

export async function deleteS3Object(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3.send(command);
}
