# Hashicorp Releases Cacher

## Overview

This project deploys a [Serverless](https://serverless.com/cli/) artifact caching service for `releases.hashicorp.com`.

It's primary aim is to support [tfenv](https://github.com/tfutils/tfenv) (& related tools like [ihlp](https://github.com/troyready/ihlp)) in caching Terraform archives.

**NOTE:** Unmodified tfenv is not currently supported, pending acceptance/release [of this PR](https://github.com/tfutils/tfenv/pull/291).

## Setup

### Pre-reqs

* Clone the project
* Configure the allowed IPs to access the service:
    * Search for `aws:SourceIp` in serverless.ts & edit/uncomment the IP restriction, turning:

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
