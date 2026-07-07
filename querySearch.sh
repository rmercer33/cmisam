#!/bin/bash

# ==============================================================================
# CONFIGURATION
# ==============================================================================
TABLE_NAME="cmiSearch"
ENDPOINT="http://localhost:8000"
REGION="us-east-1"

PARTITION_KEY_NAME="source" # Replace with your actual Partition Key name
SORT_KEY_NAME="sk"     # Replace with your actual Sort Key name

# Target values
TARGET_PARTITION_VAL="raj"
SORT_KEY_PREFIX="13" # The prefix string you are searching for
# ==============================================================================

echo "🔎 Searching for sort keys starting with '${SORT_KEY_PREFIX}'..."

aws dynamodb query \
	--table-name "$TABLE_NAME" \
	--endpoint-url "$ENDPOINT" \
	--region "$REGION" \
	--key-condition-expression "#pk = :pk_val AND begins_with(#sk, :sk_prefix)" \
	--expression-attribute-names "{\"#pk\":\"$PARTITION_KEY_NAME\",\"#sk\":\"$SORT_KEY_NAME\"}" \
	--expression-attribute-values "{\":pk_val\":{\"S\":\"$TARGET_PARTITION_VAL\"}, \":sk_prefix\":{\"S\":\"$SORT_KEY_PREFIX\"}}" \
	--output json
