import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';

export class EmsPracticeMonitorStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create an S3 bucket to store the static files
    const bucket = new s3.Bucket(this, 'website-bucket');

    // Upload the static files
    new s3Deploy.BucketDeployment(this, 'deploy-website', {
      sources: [s3Deploy.Source.asset(`${__dirname}/../../../build`)],
      destinationBucket: bucket,
    });

    // Create the DynamoDB that will store the connection information
    const connectionTable = new dynamodb.Table(this, 'connections', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'MonitorId',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Create the lambda function that will handle the logic
    const websocketLambda = new lambdaNodeJs.NodejsFunction(this, 'websocket', {
      entry: `${__dirname}/websocket-lambda.ts`,
      environment: {
        TABLE_CONNECTIONS: connectionTable.tableName,
      },
    });
    connectionTable.grantReadWriteData(websocketLambda);

    // Create the API gateway
    const api = new apigateway.WebSocketApi(this, 'api', {
      connectRouteOptions: {
        integration: new apigatewayIntegrations.WebSocketLambdaIntegration(
          'disconnect',
          websocketLambda,
        ),
      },
      disconnectRouteOptions: {
        integration: new apigatewayIntegrations.WebSocketLambdaIntegration(
          'disconnect',
          websocketLambda,
        ),
      },
      defaultRouteOptions: {
        integration: new apigatewayIntegrations.WebSocketLambdaIntegration(
          'default',
          websocketLambda,
        ),
      },
    });
    const apiStage = new apigateway.WebSocketStage(this, 'api-stage', {
      webSocketApi: api,
      stageName: 'api',
      autoDeploy: true,
    });
    apiStage.grantManagementApiAccess(websocketLambda);

    // Function to allow serving index.html via cloudfront
    const indexHtmlFunction = new cloudfront.Function(this, 'index-html', {
      code: cloudfront.FunctionCode.fromInline(`function handler(event) {
        const request = event.request;
        const uri = request.uri;
        if (uri.endsWith('/')) {
          request.uri += 'index.html';
        } else if (!uri.includes('.')) {
          request.uri += '/index.html';
        }
        return request;
      }`),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    // Create the CloudFront distribution
    new cloudfront.Distribution(this, 'cloudfront', {
      defaultBehavior: {
        origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(bucket),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        functionAssociations: [
          {
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            function: indexHtmlFunction,
          },
        ],
      },
      additionalBehaviors: {
        '/api': {
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          origin: new cloudfrontOrigins.HttpOrigin(
            `${api.apiId}.execute-api.${this.region}.${this.urlSuffix}`,
          ),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },
    });
  }
}
