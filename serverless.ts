import type { AWS } from "@serverless/typescript";

const cacheBucketResourceName = "CacheBucket";

const serverlessConfiguration: AWS = {
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
      events: [{ httpApi: "*" }],
    },
  },
  package: {
    individually: true,
  },
  plugins: ["serverless-esbuild"],
  provider: {
    architecture: "arm64",
    name: "aws",
    runtime: "nodejs16.x",
    apiGateway: {
      resourcePolicy: [
        {
          Effect: "Allow",
          Principal: "*",
          Action: "execute-api:Invoke",
          Resource: ["execute-api:/*/*/*"],
          // Condition: {
          //   IpAddress: {
          //     "aws:SourceIp": ["X.X.X.X"],
          //   },
          // },
        },
      ],
    },
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

module.exports = serverlessConfiguration;
