# core/r2_client.py
import os
import boto3
from dotenv import load_dotenv

load_dotenv()

def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=os.getenv('R2_ENDPOINT'),
        aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
        region_name='auto',
    )

def get_r2_bucket_name():
    return os.getenv('R2_BUCKET_NAME')