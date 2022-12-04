import type { AWS } from "@serverless/typescript";

interface AWSWithFunctionRoles extends AWS {
  // Need to allow iamRoleStatements on functions
  // https://github.com/functionalone/serverless-iam-roles-per-function/issues/118
  functions?: { [k: string]: any };
}

export const cacheBucketResourceName = "CacheBucket";

export const serverlessConfiguration: AWSWithFunctionRoles = {
  custom: {
    esbuild: {
      bundle: true,
      minify: true,
      sourcemap: true,
    },
  },
  functions: {
    dlProxy: {
      environment: {
        BUCKET_NAME: {
          Ref: cacheBucketResourceName,
        },
      },
      handler: "src/index.handler",
      iamRoleStatements: [
        {
          Effect: "Allow",
          Action: ["s3:ListBucket"],
          Resource: {
            "Fn::GetAtt": [cacheBucketResourceName, "Arn"],
          },
        },
        {
          Effect: "Allow",
          Action: ["s3:GetObject", "s3:PutObject"],
          Resource: {
            "Fn::Join": [
              "",
              [
                {
                  "Fn::GetAtt": [cacheBucketResourceName, "Arn"],
                },
                "/*",
              ],
            ],
          },
        },
      ],
      events: [{ httpApi: "*" }],
    },
  },
  package: {
    individually: true,
  },
  plugins: ["serverless-esbuild", "serverless-iam-roles-per-function"],
  provider: {
    architecture: "arm64",
    name: "aws",
    runtime: "nodejs16.x",
    timeout: 28,
  },
  resources: {
    Outputs: {
      CacheBucketName: {
        Description: "Name of the S3 Bucket with cached releases",
        Value: { Ref: cacheBucketResourceName },
      },
    },
    Resources: {
      [cacheBucketResourceName]: {
        Type: "AWS::S3::Bucket",
      },
    },
  },
  service: "hashicorp-releases-cacher",
};
