import { serverlessConfiguration } from "./serverless_base";

// Authentication option 1: source IPs
// i.e., running in a VPC
// Leave off the Condition entirely to permit "public" access
serverlessConfiguration.provider.apiGateway = {
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
};

// // Authentication option 2: Basic/Bearer authentication
// // (delete the above serverlessConfiguration.provider.apiGateway configuration entirely)
// const customAuthorizerName = "customAuthorizer";
// const customAuthorizerFunctionName = "authorizer";
// const identityPoolResourceName = "IdentityPool";
// (serverlessConfiguration.provider.httpApi = {
//   authorizers: {
//     [customAuthorizerName]: {
//       enableSimpleResponses: true,
//       type: "request",
//       functionName: customAuthorizerFunctionName,
//     },
//   },
// }),
//   (serverlessConfiguration.functions!.dlProxy.events[0] = {
//     httpApi: { path: "*", authorizer: customAuthorizerName },
//   });
// serverlessConfiguration.functions![customAuthorizerFunctionName] = {
//   handler: "src/authorizer.handler",
//   environment: {
//     JWT_VERIFIER_CONFIGS: {
//       "Fn::Join": [
//         "",
//         [
//           '[{"issuer":"https://cognito-identity.amazonaws.com","audience":"',
//           { Ref: identityPoolResourceName },
//           '","jwksUri":"https://cognito-identity.amazonaws.com/.well-known/jwks_uri"}]',
//         ],
//       ],
//     },
//   },
// };
// serverlessConfiguration.resources!.Resources![identityPoolResourceName] = {
//   Type: "AWS::Cognito::IdentityPool",
//   Properties: {
//     AllowUnauthenticatedIdentities: false,
//     DeveloperProviderName: "cognitoidentity",
//   },
// };

module.exports = serverlessConfiguration;
