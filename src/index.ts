/**
 * Artifact Cacher API
 *
 * @packageDocumentation
 */

import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";

import { https, FollowOptions } from "follow-redirects";
import { RequestOptions } from "https";
import { SecureContextOptions } from "tls";
import * as fs from "fs";
import * as path from "path";
import * as tmp from "tmp-promise";
import { URL } from "url";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import "source-map-support/register";

const bucketName = process.env.BUCKET_NAME as string;
const s3Client = new S3Client({});

/** Download to local file */
async function httpsGetToFile(
  options:
    | string
    | (
        | RequestOptions
        | (SecureContextOptions & {
            rejectUnauthorized?: boolean | undefined;
            servername?: string | undefined;
          } & FollowOptions<RequestOptions>)
      ),
  filePath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath, { flags: "wx" });

    const request = https.get(options, (response) => {
      if (response.statusCode === 200) {
        response.pipe(writeStream);
      } else {
        writeStream.close();
        fs.unlink(filePath, () => {}); // eslint-disable-line @typescript-eslint/no-empty-function
        reject(
          `Instead of 200, code ${response.statusCode} (${response.statusMessage})`,
        );
      }
    });

    request.on("error", (err) => {
      writeStream.close();
      fs.unlink(filePath, () => {}); // eslint-disable-line @typescript-eslint/no-empty-function
      reject(err.message);
    });

    writeStream.on("finish", () => {
      resolve();
    });

    writeStream.on("error", (err) => {
      writeStream.close();

      if ((err as NodeJS.ErrnoException).code === "EEXIST") {
        reject("File already exists");
      } else {
        fs.unlink(filePath, () => {}); // eslint-disable-line @typescript-eslint/no-empty-function
        reject(err.message);
      }
    });
  });
}

/** Determine if s3 object already exists */
export async function checkForCachedObject(
  objectKey: string,
): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({ Bucket: bucketName, Key: objectKey }),
    );
  } catch (error) {
    if (error.name == "NotFound") {
      return false;
    }
    throw error;
  }
  return true;
}

/** Generate download URL for s3 object */
async function getPresignedUrl(objectKey: string): Promise<string> {
  return await getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: bucketName, Key: objectKey }),
  );
}

/** Cache file on s3 */
async function cacheOnS3(objectKey: string): Promise<void> {
  const tmpDir = await tmp.dir({ unsafeCleanup: true });
  const cachedFilePath = path.join(tmpDir.path, path.basename(objectKey));
  const archiveDownloadOpts = new URL(
    "https://releases.hashicorp.com/" + objectKey,
  ) as FollowOptions<RequestOptions>;
  archiveDownloadOpts.maxBodyLength = 200 * 1024 * 1024;
  await httpsGetToFile(archiveDownloadOpts, cachedFilePath);
  const s3Upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucketName,
      Key: objectKey,
      Body: fs.createReadStream(cachedFilePath),
    },
  });
  await s3Upload.done();
}

/** AWS Lambda entrypoint */
export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
  context: Context, // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<APIGatewayProxyResultV2> => {
  const s3ObjectKey = event.rawPath.substring(1);

  if (!(await checkForCachedObject(s3ObjectKey))) {
    console.log("calling cacheOnS3");
    await cacheOnS3(s3ObjectKey);
  }

  return {
    body: "",
    statusCode: 302,
    headers: {
      Location: await getPresignedUrl(s3ObjectKey),
    },
  };
};
