# Hashicorp Releases Cacher

## Overview

This project deploys a [Serverless](https://serverless.com/cli/) artifact caching service for `releases.hashicorp.com`.

It's primary aim is to support [tfenv v3+](https://github.com/tfutils/tfenv) (& related tools like [ihlp](https://github.com/troyready/ihlp)) in caching Terraform archives.

## Setup

### Pre-reqs

* Clone the project
* Choose an authentication source, permitted IP addresses or JWT tokens, and edit serverless.ts to use it

#### Authorized IPs

To configure the allowed IPs to access the service, search for `aws:SourceIp` in serverless.ts & edit/uncomment the IP restriction, turning:

```
      // Condition: {
      //   IpAddress: {
      //     "aws:SourceIp": ["X.X.X.X"],
      //   },
      // },
```
into something like:
```
      Condition: {
        IpAddress: {
         "aws:SourceIp": ["1.2.3.4"],
        },
      },
```

Serverless [variable lookup](https://serverless.com/framework/docs/providers/aws/guide/variables/) can be used here to dynamically retrieve the values, e.g. `"aws:SourceIp": ["${ssm:/path/to/stringlistparam~split}"]`
 

#### JWT Tokens

JWT tokens can be used for auth (e.g. for use with [the TFENV_NETRC_PATH environment variable](https://github.com/tfutils/tfenv#tfenv_netrc_path)). The example serverless.ts configuration includes a [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html) that will issue tokens for use with the caching service.

To use it:
* Edit serverless.ts, and delete or comment out the first source ip auth configuration section (`serverlessConfiguration.provider.apiGateway = {...`)
* Uncomment the Basic/Bearer authentication section
* Deploy the stack (see below)
* Provide the token when using the service. E.g., for the example Cognito Identity Pool config (subsituting your APIGATEWAYDOMAIN, IDENTITYPOOLID, and REGION):

```
export TFENV_NETRC_PATH="$PWD/.netrc.tfenv"
echo "machine APIGATEWAYDOMAIN" > $TFENV_NETRC_PATH
echo "login token" >> $TFENV_NETRC_PATH
echo "password $(aws cognito-identity get-open-id-token-for-developer-identity --identity-pool-id IDENTITYPOOLID --logins "cognitoidentity=$USER" --region REGION --query "Token" --output text)" >> $TFENV_NETRC_PATH
```

### Deploying

* Run `npm install`
    * If any errors arise try deleting `package-lock.json` and trying again
* Run sls deploy for your stage & region; e.g. for the "prod" stage in Oregon: `npx sls deploy -s prod -r us-west-2`

## Use

Set the stack endpoint as the `TFENV_REMOTE` environment variable, e.g. for the prod stage in Oregon: `export TFENV_REMOTE=$(aws cloudformation --region us-west-2 describe-stacks --stack-name hashicorp-releases-cacher-prod --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" --output text)`

### Terraform Provider Network Mirror Use

The stack endpoint also supports being used as a [Terraform Provider Network Mirror](https://www.terraform.io/docs/internals/provider-network-mirror-protocol.html) when providers are synced to the the prefix `tf-providers-network-mirror` on the S3 bucket, e.g. for the prod stage in Oregon:

```bash
# cd to terraform directory
export WORKING_TF_CACHE_DIR=$(mktemp -d)
terraform providers mirror -platform=linux_arm64 -platform=linux_amd64 -platform=darwin_amd64 -platform=windows_amd64 $WORKING_TF_CACHE_DIR
aws s3 sync --delete --acl public-read $WORKING_TF_CACHE_DIR/ s3://$(aws cloudformation --region us-west-2 describe-stacks --stack-name hashicorp-releases-cacher-prod --query "Stacks[0].Outputs[?OutputKey=='CacheBucketName'].OutputValue" --output text)/tf-providers-network-mirror/
echo "provider_installation { network_mirror { url = \"$(aws cloudformation --region us-west-2 describe-stacks --stack-name hashicorp-releases-cacher-prod --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" --output text)/tf-providers-network-mirror/\" } }" >> $HOME/.terraformrc
```
