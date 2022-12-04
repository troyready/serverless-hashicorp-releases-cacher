/**
 * Lambda authorizer
 *
 * @packageDocumentation
 */

import {
  APIGatewaySimpleAuthorizerResult,
  APIGatewayRequestAuthorizerEventV2,
  APIGatewayRequestSimpleAuthorizerHandlerV2,
} from "aws-lambda";
import { JwtRsaVerifier } from "aws-jwt-verify";
import "source-map-support/register";

const jwtVerifierConfigs = process.env.JWT_VERIFIER_CONFIGS
  ? JSON.parse(process.env.JWT_VERIFIER_CONFIGS)
  : [];

// Determine if provided token is valid
async function getAuthStatus(authHeader: string): Promise<boolean> {
  let token: string;

  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.split("Bearer ")[1];
  } else if (authHeader.startsWith("Basic ")) {
    try {
      token = Buffer.from(authHeader.split("Basic ")[1], "base64")
        .toString()
        .split(":")[1];
    } catch {
      return false;
    }
  } else {
    return false;
  }

  for (const jwtVerifierConfig of jwtVerifierConfigs) {
    const verifier = JwtRsaVerifier.create(jwtVerifierConfig);
    try {
      await verifier.verify(token, jwtVerifierConfig);
      return true;
    } catch {
      console.log("Invalid token");
    }
  }
  return false;
}

/** AWS Lambda entrypoint */
export const handler: APIGatewayRequestSimpleAuthorizerHandlerV2 = async (
  event: APIGatewayRequestAuthorizerEventV2,
): Promise<APIGatewaySimpleAuthorizerResult> => {
  if (!event.headers || !("authorization" in event.headers)) {
    console.log("No authorization header");
    return { isAuthorized: false };
  }

  const authStatus: boolean = await getAuthStatus(event.headers.authorization!);
  return { isAuthorized: authStatus };
};
