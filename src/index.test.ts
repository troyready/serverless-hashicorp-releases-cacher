const mockBucketName = "mocked-jest-bucket";
process.env.BUCKET_NAME = mockBucketName;

// import {
//   APIGatewayProxyEvent,
//   APIGatewayProxyResult,
//   Context,
// } from "aws-lambda";

const mockS3Send = jest.fn();
jest.mock("@aws-sdk/client-s3", () => {
  return {
    ...jest.requireActual("@aws-sdk/client-s3"),
    S3Client: function S3Client(): void {
      this.send = mockS3Send;
    },
  };
});
jest.mock("@aws-sdk/s3-request-presigner", () => {
  return {
    ...jest.requireActual("@aws-sdk/s3-request-presigner"),
    getSignedUrl: function getSignedUrl(
      client,
      command,
      options?, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): Promise<string> {
      return new Promise((resolve, reject) => {
        if ("Bucket" in command.input && "Key" in command.input) {
          resolve(
            "https://" +
              command.input.Bucket +
              ".s3.us-west-2.amazonaws.com/" +
              command.input.Key +
              "?...",
          );
        } else {
          reject(new Error("Missing required parameters"));
        }
      });
    },
  };
});
import { HeadObjectCommand } from "@aws-sdk/client-s3";

import { checkForCachedObject } from "./index";

// function unusedCallback<T>() {
//   return undefined as any as T;
// }
const mockS3SendImplementation = jest.fn().mockImplementation((command) => {
  if (command instanceof HeadObjectCommand) {
    return new Promise((resolve, reject) => {
      if (
        command.input.Key &&
        ["mockexists1", "mockexists2"].includes(command.input.Key)
      ) {
        resolve({ ContentLength: 3191, ContentType: "image/jpeg" });
      } else {
        reject({ name: "NotFound" });
      }
    });
  }
});

describe("Support function tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("checkForCachedObject returns expected results", async () => {
    mockS3Send.mockImplementation(mockS3SendImplementation);
    const checkForCachedObjectResult1 = await checkForCachedObject(
      "mockexists1",
    );
    const checkForCachedObjectResult2 = await checkForCachedObject(
      "doesntexist",
    );
    expect(checkForCachedObjectResult1).toBe(true);
    expect(checkForCachedObjectResult2).toBe(false);
  });
});
