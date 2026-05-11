import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function mediaObjectKey(...parts) {
  const rootPrefix = process.env.S3_MEDIA_PREFIX?.trim().replace(/^\/+|\/+$/g, "") ?? "";
  return [rootPrefix, ...parts]
    .map((part) => String(part).trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

async function streamToString(body) {
  if (!body) return "";
  if (typeof body.transformToString === "function") return body.transformToString();

  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

const region = requiredEnv("AWS_REGION");
const bucket = requiredEnv("S3_BUCKET_NAME");
const client = new S3Client({
  region,
  credentials: {
    accessKeyId: requiredEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("AWS_SECRET_ACCESS_KEY"),
  },
});

const key = mediaObjectKey("smoke-tests", `s3-media-${Date.now()}.txt`);
const body = `Positives S3 media smoke test ${new Date().toISOString()}`;

try {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(body),
      ContentType: "text/plain; charset=utf-8",
      CacheControl: "private, max-age=60",
    })
  );

  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const received = await streamToString(object.Body);

  if (received !== body) {
    throw new Error("S3 roundtrip body did not match.");
  }

  console.log(`S3 media smoke test passed for s3://${bucket}/${key}`);
} finally {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch((error) => {
    console.warn(`Could not delete smoke test object s3://${bucket}/${key}: ${error.message}`);
  });
}
