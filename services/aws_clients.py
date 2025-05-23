# services/aws_clients.py

import boto3
from botocore.config import Config
from config import AWS_REGION  # or however you store your constants

aws_config = Config(
    region_name=AWS_REGION,
    retries={"max_attempts": 3, "mode": "standard"},
    connect_timeout=3,
    read_timeout=5,
)

# Global shared Cognito client
cognito_client = boto3.client("cognito-idp", config=aws_config)
