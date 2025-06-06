#!/bin/bash
# Script to initialize DynamoDB Local with ThothObjects table

echo "Waiting for DynamoDB Local to be ready..."
sleep 10

echo "Creating ThothObjects table..."
aws dynamodb create-table \
    --table-name ThothObjects \
    --attribute-definitions \
        AttributeName=pk,AttributeType=S \
        AttributeName=sk,AttributeType=S \
    --key-schema \
        AttributeName=pk,KeyType=HASH \
        AttributeName=sk,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url http://localhost:8000 \
    --region us-east-1

echo "ThothObjects table created successfully"