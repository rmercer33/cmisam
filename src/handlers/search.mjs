// Create clients and set shared const values outside of the handler.

// Create a DocumentClient that represents the query to add an item
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { filterItemsByText } from "../utils/searchFilter.mjs";

const client = new DynamoDBClient({
  endpoint: "http://local-dynamodb:8000",
});
const ddbDocClient = DynamoDBDocumentClient.from(client);

// Get the DynamoDB table name from environment variables
const tableName = process.env.SEARCH_TABLE;

/**
 * A simple example includes a HTTP post method to add one item to a DynamoDB table.
 */
export const searchHandler = async (event) => {
  if (event.httpMethod !== "POST") {
    throw new Error(
      `postMethod only accepts POST method, you tried: ${event.httpMethod} method.`,
    );
  }
  // All log statements are written to CloudWatch
  console.info("received:", event.body);

  // Get id and name from the body of the request
  const body = JSON.parse(event.body);
  const source = body.source;
  const query = body.query;
  const strict = body.strict;
  const width = body.width;

  if (!source || !query) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Missing required 'source' or 'query'" }),
    };
  }

  // Creates a new item, or replaces an old item with a new item
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#put-property
  const queryParams = {
    TableName: tableName,
    KeyConditionExpression: "#sourceAttr = :sourceValue",
    ExpressionAttributeNames: {
      "#sourceAttr": "source",
    },
    ExpressionAttributeValues: {
      ":sourceValue": source,
    },
  };

  try {
    let accumulatedItems = [];
    let lastEvaluatedKey = undefined;

    do {
      const activeParams = {
        ...queryParams,
        ExclusiveStartKey: lastEvaluatedKey,
      };
      const command = new QueryCommand(activeParams);
      const response = await ddbDocClient.send(command);

      if (response.Items) {
        accumulatedItems.push(...response.Items);
      }
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(
      "Found %s total database records before filtering",
      accumulatedItems.length,
    );

    const filteredItems = filterItemsByText(accumulatedItems, query, strict, width);
    console.log("Found %s matches after filtering", filteredItems.length);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: filteredItems }),
    };
  } catch (err) {
    console.error("Error executing query:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Internal Server Error",
        error: err.message,
      }),
    };
  }
};
