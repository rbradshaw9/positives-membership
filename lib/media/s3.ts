import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let cachedClient: S3Client | null = null;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function getS3MediaConfig() {
  return {
    region: requiredEnv("AWS_REGION"),
    bucket: requiredEnv("S3_BUCKET_NAME"),
    rootPrefix: process.env.S3_MEDIA_PREFIX?.trim().replace(/^\/+|\/+$/g, "") ?? "",
  };
}

export function getS3Client() {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: requiredEnv("AWS_REGION"),
      credentials: {
        accessKeyId: requiredEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("AWS_SECRET_ACCESS_KEY"),
      },
    });
  }

  return cachedClient;
}

export function mediaObjectKey(...parts: string[]) {
  const { rootPrefix } = getS3MediaConfig();
  const cleanParts = [rootPrefix, ...parts]
    .map((part) => part.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);

  return cleanParts.join("/");
}

export async function putMediaObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}) {
  const { bucket } = getS3MediaConfig();

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: params.cacheControl ?? "private, max-age=31536000, immutable",
    })
  );
}

export async function getMediaObject(params: {
  bucket?: string;
  key: string;
  range?: string;
}) {
  const { bucket } = getS3MediaConfig();

  return getS3Client().send(
    new GetObjectCommand({
      Bucket: params.bucket || bucket,
      Key: params.key,
      Range: params.range,
    })
  );
}

export async function headMediaObject(params: {
  bucket?: string;
  key: string;
}) {
  const { bucket } = getS3MediaConfig();

  return getS3Client().send(
    new HeadObjectCommand({
      Bucket: params.bucket || bucket,
      Key: params.key,
    })
  );
}
