import os
import json
import time
import logging
import base64
import requests
import re
import asyncio
from io import BytesIO
from typing import List, Dict, Optional, Any, Union
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, UploadFile, File, Form, Body, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, EmailStr
import boto3
import mysql.connector
from mysql.connector import Error
from dbutils.pooled_db import PooledDB
import jwt
import hashlib
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from decimal import Decimal
from dotenv import load_dotenv
import numpy as np
from bedrock_agentcore import BedrockAgentCoreApp
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Load environment variables
load_dotenv(override=True)
print("DB Name:", os.getenv('DB_NAME'))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize FastAPI app
app = FastAPI(
    title="EcoLafaek API",
    description="Environmental waste monitoring API for Timor-Leste powered by AWS Bedrock AgentCore",
    version="1.0.0",
    docs_url=None if os.getenv("ENVIRONMENT") == "production" else "/docs",
    redoc_url=None if os.getenv("ENVIRONMENT") == "production" else "/redoc"
)

# Add rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration - Restrict to known origins in production
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
    max_age=3600,
)

# All charts are saved to S3 - no local static directory needed

# Amazon Bedrock AgentCore Configuration
agentcore_app = BedrockAgentCoreApp()

# Background task to clean up old charts from S3
import threading

def cleanup_s3_charts():
    """Delete all files in static/charts/ folder on S3 every hour"""
    while True:
        try:
            # Wait 1 hour
            time.sleep(3600)  # 3600 seconds = 1 hour

            # Get S3 configuration
            s3_bucket = os.getenv('S3_BUCKET_NAME')
            if not s3_bucket:
                logger.warning("S3_BUCKET_NAME not configured, skipping cleanup")
                continue

            # Initialize S3 client
            s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )

            # List all objects in static/charts/
            prefix = 'static/charts/'
            response = s3_client.list_objects_v2(Bucket=s3_bucket, Prefix=prefix)

            if 'Contents' in response:
                # Delete all files
                objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]

                if objects_to_delete:
                    s3_client.delete_objects(
                        Bucket=s3_bucket,
                        Delete={'Objects': objects_to_delete}
                    )
                    logger.info(f"Cleaned up {len(objects_to_delete)} chart files from S3")
                else:
                    logger.info("No chart files to clean up")
            else:
                logger.info("No chart files found in S3")

        except Exception as e:
            logger.error(f"Error cleaning up S3 charts: {e}")

# Start cleanup task in background thread
cleanup_thread = threading.Thread(target=cleanup_s3_charts, daemon=True)
cleanup_thread.start()
logger.info("Started S3 charts cleanup task (runs every 1 hour)")

# Amazon Bedrock configuration
BEDROCK_MODEL_ID = os.getenv('BEDROCK_MODEL_ID', 'amazon.nova-pro-v1:0')
BEDROCK_REGION = os.getenv('AWS_REGION', 'us-east-1')

# Initialize Bedrock client
try:
    bedrock_runtime = boto3.client(
        'bedrock-runtime',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=BEDROCK_REGION
    )
    logger.info(f"Using Bedrock model: {BEDROCK_MODEL_ID}")
except Exception as e:
    logger.critical(f"Bedrock configuration failed: {e}")
    raise ValueError("Failed to configure Bedrock client")

# AWS S3 configuration
try:
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=BEDROCK_REGION
    )
    S3_BUCKET = os.getenv('S3_BUCKET_NAME')
except Exception as e:
    logger.warning(f"S3 client initialization failed: {e}. File uploads will be disabled.")
    s3_client = None
    S3_BUCKET = None

# JWT configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'development_secret_do_not_use_in_production')
JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))

# Email configuration
EMAIL_USER = os.getenv('EMAIL_USER')
EMAIL_PASS = os.getenv('EMAIL_PASS')
EMAIL_SERVER = os.getenv('EMAIL_SERVER')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'tl_waste_monitoring'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'port': int(os.getenv('DB_PORT', '3306'))
}

# Amazon Titan Embed configuration
TITAN_EMBED_MODEL = "amazon.titan-embed-image-v1"
embedding_enabled = True  # Embeddings are enabled with boto3 Bedrock client

# Database connection pool for better performance
db_pool = PooledDB(
    creator=mysql.connector,
    maxconnections=20,  # Maximum connections in pool
    mincached=2,  # Minimum idle connections
    maxcached=10,  # Maximum idle connections
    maxshared=20,  # Maximum shared connections
    blocking=True,  # Block if no connections available
    ping=1,  # Ping connection before using
    **DB_CONFIG
)

# Get database connection from pool
def get_db_connection():
    """Get a database connection from the pool"""
    try:
        connection = db_pool.connection()
        return connection
    except Error as e:
        logger.error(f"Database connection error: {e}")
        return None

# Define Pydantic models for request/response validation
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    phone_number: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class OTPRequest(BaseModel):
    email: EmailStr
    username: str
    otp: Optional[str] = None
    email_credentials: Optional[Dict[str, str]] = None

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class ResendOTPRequest(BaseModel):
    email: EmailStr

class ReportCreate(BaseModel):
    user_id: int
    latitude: float
    longitude: float
    description: str
    image_data: Optional[str] = None
    device_info: Optional[Dict[str, str]] = None

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

class UpdateUserProfile(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    profile_image_url: Optional[str] = None

class TokenData(BaseModel):
    token: str
    user: Dict[str, Any]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Helper functions
def hash_password(password, salt=None):
    """Hash a password with a salt and return base64 encoded string"""
    if not salt:
        salt = os.urandom(32)  # Generate a new salt if not provided
    
    # Hash the password with the salt
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt,
        100000  # Number of iterations
    )
    
    # Combine salt and key, then base64 encode for storage in text column
    storage = salt + key
    return base64.b64encode(storage).decode('ascii')

def verify_password(stored_password, provided_password):
    """Verify a password against a stored hash"""
    # Decode the base64 stored password
    decoded = base64.b64decode(stored_password.encode('ascii'))
    
    salt = decoded[:32]  # Get the salt from the stored password
    stored_key = decoded[32:]
    
    # Hash the provided password with the same salt
    key = hashlib.pbkdf2_hmac(
        'sha256',
        provided_password.encode('utf-8'),
        salt,
        100000  # Same number of iterations as in hash_password
    )
    
    # Compare the generated key with the stored key
    return key == stored_key

def generate_token(user_id):
    """Generate a JWT token for the user"""
    expiration = datetime.now() + timedelta(hours=JWT_EXPIRATION_HOURS)
    
    payload = {
        'user_id': user_id,
        'exp': expiration
    }
    
    # Encode JWT token
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_token(token):
    """Verify a JWT token and return the user ID if valid"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None  # Token has expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

def check_and_create_hotspots(cursor, connection, report, report_id, analysis_result):
    """
    Check for nearby reports and create/update hotspots if criteria are met.
    This function works for both waste and non-waste reports.
    
    Args:
        cursor: Database cursor
        connection: Database connection 
        report: Report data dictionary
        report_id: ID of the current report
        analysis_result: Analysis results dictionary
    
    Returns:
        Dictionary with hotspot creation results
    """
    try:
        # Find nearby reports (within 500 meters)
        cursor.execute(
            """
            SELECT report_id, latitude, longitude
            FROM reports
            WHERE (
                6371 * acos(
                    cos(radians(%s)) * cos(radians(latitude)) * 
                    cos(radians(longitude) - radians(%s)) + 
                    sin(radians(%s)) * sin(radians(latitude))
                )
            ) < 0.5  -- Reports within 500 meters
            AND report_id != %s
            AND status = 'analyzed'  -- Only include analyzed reports in hotspots
            """,
            (report['latitude'], report['longitude'], report['latitude'], report_id)
        )
        
        nearby_reports = cursor.fetchall()
        nearby_count = len(nearby_reports)
        
        logger.info(f"Found {nearby_count} nearby reports for report {report_id}")
        
        # If there are nearby reports, create or update a hotspot
        if nearby_count >= 2:  # Minimum 3 reports to form a hotspot (including this one)
            # Check if a hotspot already exists in this area
            cursor.execute(
                """
                SELECT hotspot_id
                FROM hotspots
                WHERE (
                    6371 * acos(
                        cos(radians(%s)) * cos(radians(center_latitude)) * 
                        cos(radians(center_longitude) - radians(%s)) + 
                        sin(radians(%s)) * sin(radians(center_latitude))
                    )
                ) < 0.5  -- Within 500 meters
                """,
                (report['latitude'], report['longitude'], report['latitude'])
            )
            
            hotspot = cursor.fetchone()
            
            if hotspot:
                # Update existing hotspot
                hotspot_id = hotspot['hotspot_id']
                cursor.execute(
                    """
                    UPDATE hotspots
                    SET last_reported = %s, total_reports = %s
                    WHERE hotspot_id = %s
                    """,
                    (datetime.now().date(), nearby_count + 1, hotspot_id)
                )
                logger.info(f"Updated existing hotspot {hotspot_id}")
            else:
                # Create new hotspot
                cursor.execute(
                    """
                    INSERT INTO hotspots (
                        name, center_latitude, center_longitude, radius_meters,
                        location_id, first_reported, last_reported, total_reports,
                        average_severity, status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        f"Hotspot near {report.get('address_text', 'Unknown')}",
                        report['latitude'],
                        report['longitude'],
                        500,  # 500 meter radius
                        report.get('location_id'),
                        datetime.now().date(),
                        datetime.now().date(),
                        nearby_count + 1,  # Include this report
                        analysis_result.get('severity_score', 1),
                        'active'
                    )
                )
                
                hotspot_id = cursor.lastrowid
                logger.info(f"Created new hotspot {hotspot_id}")
            
            # Associate current report with hotspot if not already linked
            cursor.execute(
                """
                SELECT * FROM hotspot_reports 
                WHERE hotspot_id = %s AND report_id = %s
                """, 
                (hotspot_id, report_id)
            )
            
            if not cursor.fetchone():
                cursor.execute(
                    """
                    INSERT INTO hotspot_reports (hotspot_id, report_id)
                    VALUES (%s, %s)
                    """,
                    (hotspot_id, report_id)
                )
                logger.info(f"Associated report {report_id} with hotspot {hotspot_id}")
            
            # Associate all nearby reports with the hotspot if not already linked
            for nearby_report in nearby_reports:
                nearby_id = nearby_report['report_id']
                
                cursor.execute(
                    """
                    SELECT * FROM hotspot_reports 
                    WHERE hotspot_id = %s AND report_id = %s
                    """, 
                    (hotspot_id, nearby_id)
                )
                
                if not cursor.fetchone():
                    cursor.execute(
                        """
                        INSERT INTO hotspot_reports (hotspot_id, report_id)
                        VALUES (%s, %s)
                        """,
                        (hotspot_id, nearby_id)
                    )
            
            # Update average severity based on all reports in the hotspot
            cursor.execute(
                """
                SELECT AVG(ar.severity_score) as avg_severity
                FROM hotspot_reports hr
                JOIN analysis_results ar ON hr.report_id = ar.report_id
                WHERE hr.hotspot_id = %s
                """,
                (hotspot_id,)
            )
            
            avg_result = cursor.fetchone()
            if avg_result and avg_result['avg_severity'] is not None:
                cursor.execute(
                    """
                    UPDATE hotspots
                    SET average_severity = %s
                    WHERE hotspot_id = %s
                    """,
                    (avg_result['avg_severity'], hotspot_id)
                )
            
            connection.commit()
            
            return {
                "hotspot_created": hotspot_id,
                "total_reports": nearby_count + 1,
                "action": "updated" if hotspot else "created"
            }
        else:
            return {
                "hotspot_created": None,
                "total_reports": nearby_count + 1,
                "action": "insufficient_reports"
            }
    
    except Exception as e:
        logger.error(f"Error in hotspot detection: {e}")
        return {
            "hotspot_created": None,
            "error": str(e),
            "action": "error"
        }

async def get_user_from_token(token: str = Depends(oauth2_scheme)):
    """Extract user ID from token in request"""
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id

def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def send_email(to_email, subject, body_html):
    """Send an email using SMTP"""
    if not EMAIL_USER or not EMAIL_PASS or not EMAIL_SERVER:
        logger.warning("Email configuration missing. Email not sent.")
        return False
        
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = EMAIL_USER
        msg['To'] = to_email
        
        # Create HTML version of message
        html_part = MIMEText(body_html, 'html')
        msg.attach(html_part)
        
        # Connect to server and send
        server = smtplib.SMTP(EMAIL_SERVER, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.sendmail(EMAIL_USER, to_email, msg.as_string())
        server.quit()
        
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

def upload_image_to_s3(image_data, filename):
    """
    Upload base64 encoded image to AWS S3
    
    Args:
        image_data: Base64 encoded image data
        filename: Filename to use in S3
    
    Returns:
        S3 URL if successful, None otherwise
    """
    if not s3_client or not S3_BUCKET:
        logger.warning("S3 client or bucket not configured. Image upload skipped.")
        return None
        
    try:
        # Decode the base64 data
        image_binary = base64.b64decode(image_data)
        file_obj = BytesIO(image_binary)
        
        # Upload to S3
        s3_path = f"reports/{datetime.now().strftime('%Y/%m/%d')}/{filename}"
        s3_client.upload_fileobj(
            file_obj, 
            S3_BUCKET, 
            s3_path,
            ExtraArgs={'ContentType': 'image/jpeg'}
        )
        
        # Return the URL
        return f"https://{S3_BUCKET}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{s3_path}"
    
    except Exception as e:
        logger.error(f"S3 upload error: {e}")
        return None

# Amazon Bedrock AgentCore Waste Analysis Agent
@agentcore_app.entrypoint
def analyze_waste_image(payload):
    """
    EcoLafaek AI Agent for analyzing waste and environmental pollution
    Uses Amazon Bedrock/Nova for image analysis and waste categorization
    """
    try:
        image_url = payload.get("image_url")
        location = payload.get("location", {})
        description = payload.get("description", "")
        image_base64 = payload.get("image_base64", "")

        # First prompt: Determine if the image contains waste/garbage
        initial_prompt = f"""
        Carefully examine this image and determine if it shows improper waste disposal, garbage, trash, or discarded materials in the environment.

        Location: Latitude {location.get('lat')}, Longitude {location.get('lng')}
        User Description: {description}

        Only classify as waste/garbage if:
        1. The items are clearly disposed of improperly in an outdoor environment (on streets, in water bodies, forests, etc.)
        2. The items are trash/waste accumulated in trash cans, landfills, or garbage dumps
        3. The items are clearly abandoned, broken, or dumped illegally

        Do NOT classify as waste/garbage if:
        1. The items are in normal use in their intended environment (e.g., electronics on a desk)
        2. The items appear to be organized, clean, and in use
        3. The items are products being displayed or used normally
        4. The image shows an indoor setting with normal household/office items
        5. The items are properly stored or displayed

        Return your answer as a JSON object with the following structure:
        {{
          "contains_waste": true/false,
          "confidence": 0-100,
          "reasoning": "brief explanation",
          "short_description": "concise description (max 8 words)",
          "full_description": "detailed description of what you see in the image (2-3 sentences)"
        }}
        """

        # Call Bedrock Nova for initial waste detection
        response = bedrock_runtime.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "inferenceConfig": {
                    "max_new_tokens": 1000,
                    "temperature": 0.1,
                    "top_p": 0.9
                },
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "text": initial_prompt
                            },
                            {
                                "image": {
                                    "format": "jpeg",
                                    "source": {
                                        "bytes": image_base64
                                    }
                                }
                            }
                        ]
                    }
                ]
            })
        )

        # Parse response
        result = json.loads(response['body'].read())

        # Extract text from Nova Pro response format
        if 'output' in result and 'message' in result['output']:
            message = result['output']['message']
            if 'content' in message and len(message['content']) > 0:
                initial_response = message['content'][0].get('text', '')
            else:
                logger.error("No content found in Bedrock response message")
                initial_response = None
        else:
            logger.error(f"Unexpected Bedrock response format: {result}")
            initial_response = None

        if not initial_response:
            return {
                "success": False,
                "error": "analysis_failed",
                "message": "Failed to analyze image"
            }

        # Extract JSON from response
        json_match = re.search(r'\{.*\}', initial_response, re.DOTALL)
        if json_match:
            waste_check = json.loads(json_match.group())
        else:
            waste_check = {
                "contains_waste": False,
                "confidence": 75,
                "reasoning": "Failed to parse response",
                "short_description": "Unable to determine content",
                "full_description": "Unable to generate a detailed description."
            }

        # Get short and full descriptions
        short_description = waste_check.get("short_description", "")
        if len(short_description.split()) > 8:
            short_description = " ".join(short_description.split()[:8])

        full_description = waste_check.get("full_description", "")
        if not full_description:
            full_description = f"{waste_check.get('reasoning', 'No details available.')} {short_description}"

        # If the image doesn't contain waste, return minimal analysis
        if not waste_check.get("contains_waste", False):
            return {
                "success": True,
                "analysis": {
                    "waste_type": "Not Garbage",
                    "severity_score": 1,
                    "priority_level": "low",
                    "environmental_impact": "None - not waste material",
                    "estimated_volume": "0",
                    "safety_concerns": "None",
                    "analysis_notes": f"This image does not appear to contain waste material. {waste_check.get('reasoning', '')}",
                    "waste_detection_confidence": waste_check.get("confidence", 90),
                    "short_description": short_description or "Not garbage",
                    "full_description": full_description
                },
                "model_used": BEDROCK_MODEL_ID,
                "processed_at": datetime.now().isoformat()
            }

        # If image contains waste, proceed with detailed analysis
        detailed_prompt = """
        Analyze the waste/garbage in this image.

        Please determine:
        1. The main type of waste visible (e.g., Plastic, Paper, Glass, Metal, Organic, Electronic, Construction, Mixed)
        2. Severity assessment (scale 1-10, where 10 is most severe)
        3. Priority level (low, medium, high, critical)
        4. Environmental impact assessment
        5. Estimated volume
        6. Any safety concerns
        7. Full description of the waste scenario (2-3 sentences, detailed)

        Consider these factors for severity and priority:
        - Quantity/volume of waste
        - Hazard level of materials
        - Proximity to water sources or sensitive areas
        - Access to residential areas
        - Biodegradability and longevity of waste

        Structure your response as a JSON object with the following fields:
        - waste_type: Main type of waste
        - severity_score: Numeric score from 1-10
        - priority_level: "low", "medium", "high", or "critical"
        - environmental_impact: Brief description of environmental impact
        - estimated_volume: Estimated volume in cubic meters
        - safety_concerns: Any safety concerns identified
        - analysis_notes: Detailed analysis and recommendations
        - full_description: Detailed description of the waste scenario (2-3 sentences)

        Keep your analysis focused, practical, and action-oriented.
        """

        # Call Bedrock Nova for detailed analysis
        response = bedrock_runtime.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "inferenceConfig": {
                    "max_new_tokens": 1500,
                    "temperature": 0.1,
                    "top_p": 0.9
                },
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "text": detailed_prompt
                            },
                            {
                                "image": {
                                    "format": "jpeg",
                                    "source": {
                                        "bytes": image_base64
                                    }
                                }
                            }
                        ]
                    }
                ]
            })
        )

        # Parse response
        result = json.loads(response['body'].read())

        # Extract text from Nova Pro response format
        if 'output' in result and 'message' in result['output']:
            message = result['output']['message']
            if 'content' in message and len(message['content']) > 0:
                detailed_response = message['content'][0].get('text', '')
            else:
                detailed_response = None
        else:
            detailed_response = None

        if not detailed_response:
            return {
                "success": False,
                "error": "analysis_failed",
                "message": "Failed to analyze waste details"
            }

        # Extract JSON from response
        json_match = re.search(r'\{.*\}', detailed_response, re.DOTALL)
        if json_match:
            analysis_result = json.loads(json_match.group())
        else:
            analysis_result = {
                "waste_type": "Mixed",
                "severity_score": 5,
                "priority_level": "medium",
                "environmental_impact": "Unable to determine from image",
                "estimated_volume": "Unknown",
                "safety_concerns": "Unable to determine from image",
                "analysis_notes": "Analysis completed with limited details",
                "full_description": full_description
            }

        # Add the waste detection confidence and short description
        analysis_result["waste_detection_confidence"] = waste_check.get("confidence", 100)
        analysis_result["short_description"] = short_description or f"{analysis_result['waste_type']} waste, {analysis_result['priority_level']} priority"

        # Ensure full_description exists in the result
        if "full_description" not in analysis_result or not analysis_result["full_description"]:
            analysis_result["full_description"] = full_description

        return {
            "success": True,
            "analysis": analysis_result,
            "model_used": BEDROCK_MODEL_ID,
            "processed_at": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"AgentCore analysis failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback_analysis": {
                "waste_type": "Unknown",
                "confidence_score": 0,
                "analysis_notes": "Analysis failed, manual review required"
            }
        }
async def process_report_with_agent_async(report_id, image_url, latitude, longitude, description):
    """Process report using AgentCore for analysis - truly async"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Download image and convert to base64 for AgentCore
        # Run in thread pool to avoid blocking
        import concurrent.futures
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            response = await loop.run_in_executor(executor, requests.get, image_url)
        image_base64 = base64.b64encode(response.content).decode('utf-8')

        # Call AgentCore agent for analysis
        agent_payload = {
            "image_url": image_url,
            "image_base64": image_base64,
            "location": {"lat": latitude, "lng": longitude},
            "description": description
        }

        # Use AgentCore for analysis - run in thread pool to avoid blocking
        with concurrent.futures.ThreadPoolExecutor() as executor:
            analysis_result = await loop.run_in_executor(
                executor, analyze_waste_image, agent_payload
            )

        cursor.close()
        connection.close()

        return analysis_result, image_base64

    except Exception as e:
        logger.error(f"AgentCore async processing failed for report {report_id}: {e}")
        return None, None

# Core functionality for image analysis with Amazon Nova Pro via AgentCore
async def analyze_image_with_bedrock(image_url, latitude=0.0, longitude=0.0, description=""):
    """
    Analyze a waste image using Amazon Nova Pro via AgentCore

    Args:
        image_url: URL to the image
        latitude: Latitude coordinate
        longitude: Longitude coordinate
        description: User-provided description

    Returns:
        Tuple of (analysis_result dict, image_data base64 string)
    """
    max_attempts = 2  # Maximum number of retry attempts
    current_attempt = 0

    while current_attempt < max_attempts:
        try:
            current_attempt += 1
            logger.info(f"Attempt {current_attempt} - Analyzing image with AgentCore from: {image_url}")

            # Download the image
            import concurrent.futures
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as executor:
                response = await loop.run_in_executor(executor, requests.get, image_url)

            if response.status_code != 200:
                logger.error(f"Failed to download image from {image_url}: {response.status_code}")
                if current_attempt < max_attempts:
                    time.sleep(2)
                    continue
                return None, None

            # Log image details
            content_type = response.headers.get('Content-Type', 'Unknown')
            image_size = len(response.content)
            logger.info(f"Successfully downloaded image: Type={content_type}, Size={image_size} bytes")

            # Convert image to base64
            image_data = base64.b64encode(response.content).decode('utf-8')
            logger.info(f"Converted image to base64 format (length: {len(image_data)} chars)")

            # Call AgentCore agent for analysis
            agent_payload = {
                "image_url": image_url,
                "image_base64": image_data,
                "location": {"lat": latitude, "lng": longitude},
                "description": description
            }

            # Use AgentCore for analysis - run in thread pool to avoid blocking
            with concurrent.futures.ThreadPoolExecutor() as executor:
                agent_result = await loop.run_in_executor(
                    executor, analyze_waste_image, agent_payload
                )

            if not agent_result or not agent_result.get("success"):
                logger.error(f"AgentCore analysis failed: {agent_result.get('error', 'Unknown error')}")
                if current_attempt < max_attempts:
                    logger.info(f"Retrying... ({current_attempt}/{max_attempts})")
                    time.sleep(2)
                    continue
                return None, None

            # Extract analysis from AgentCore result
            analysis_result = agent_result.get("analysis", {})
            logger.info(f"AgentCore analysis complete: {analysis_result}")

            return analysis_result, image_data  # Return both analysis and image data for embeddings

        except Exception as e:
            logger.error(f"Error in analyze_image_with_bedrock (Attempt {current_attempt}/{max_attempts}): {e}")
            if current_attempt < max_attempts:
                logger.info(f"Retrying due to exception... ({current_attempt}/{max_attempts})")
                time.sleep(2)
                continue
            return None, None

    return None, None
def extract_volume_number(volume_str):
    """Extract numeric value from volume string like '5 cubic meters' -> 5.0"""
    try:
        if not volume_str or volume_str.lower() in ['unknown', 'n/a', 'not specified']:
            return 0.0
        
        # Convert to string if not already
        volume_str = str(volume_str)
        
        # Extract numbers from the string using regex
        import re
        numbers = re.findall(r'\d+\.?\d*', volume_str)
        
        if numbers:
            return float(numbers[0])
        else:
            return 0.0
    except Exception as e:
        logger.warning(f"Failed to extract volume from '{volume_str}': {e}")
        return 0.0
# Process a waste report
async def process_report(report_id, background_tasks: BackgroundTasks):
    """
    Process a waste report by analyzing its image and updating the database
    
    Args:
        report_id: ID of the report to process
        background_tasks: FastAPI background tasks for async processing
    
    Returns:
        Dictionary with processing results
    """
    try:
        # Get database connection
        connection = get_db_connection()
        if not connection:
            return {"success": False, "message": "Failed to connect to database"}
        
        cursor = connection.cursor(dictionary=True)
        
        # Update report status to analyzing
        cursor.execute(
            "UPDATE reports SET status = 'analyzing' WHERE report_id = %s",
            (report_id,)
        )
        connection.commit()
        
        # Get report data
        cursor.execute(
            """
            SELECT r.*, u.username
            FROM reports r
            LEFT JOIN users u ON r.user_id = u.user_id
            WHERE r.report_id = %s
            """,
            (report_id,)
        )
        
        report = cursor.fetchone()
        if not report:
            cursor.close()
            connection.close()
            return {"success": False, "message": f"Report {report_id} not found"}
        
        # If no image, we can't analyze - return clear error
        if not report['image_url']:
            cursor.execute(
                "UPDATE reports SET status = 'submitted' WHERE report_id = %s",
                (report_id,)
            )
            connection.commit()
            cursor.close()
            connection.close()
            return {"success": False, "message": "No image available for analysis"}
        
        # Log the image URL we're about to analyze
        logger.info(f"Processing report {report_id} with image URL: {report['image_url']}")

        # Analyze image with Nova Pro via AgentCore
        analysis_result, image_data = await analyze_image_with_bedrock(
            report['image_url'],
            report['latitude'],
            report['longitude'],
            report.get('description', '')
        )
        
        if not analysis_result:
            cursor.execute(
                "UPDATE reports SET status = 'submitted' WHERE report_id = %s",
                (report_id,)
            )
            connection.commit()
            cursor.close()
            connection.close()
            return {"success": False, "message": "Image analysis failed"}
        
        # If the image doesn't contain waste, update status to analyzed with "Not Garbage"
        if analysis_result['waste_type'] == 'Not Garbage':
            # Update the report with "Not Garbage" description and set status to analyzed
            cursor.execute(
                "UPDATE reports SET description = %s, status = %s WHERE report_id = %s",
                ("Not garbage.", "analyzed", report_id)
            )
            connection.commit()
            
            # Get or create "Not Garbage" waste type
            cursor.execute(
                "SELECT waste_type_id FROM waste_types WHERE name = %s",
                ("Not Garbage",)
            )
            waste_type_result = cursor.fetchone()
            
            waste_type_id = None
            if waste_type_result:
                waste_type_id = waste_type_result['waste_type_id']
            else:
                # Create "Not Garbage" waste type if it doesn't exist
                cursor.execute(
                    """
                    INSERT INTO waste_types (name, description, hazard_level, recyclable)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (
                        "Not Garbage",
                        "Images that do not contain waste materials",
                        'low',
                        False
                    )
                )
                connection.commit()
                waste_type_id = cursor.lastrowid
            
            # Generate embeddings for non-garbage images (pass image_data for Titan Image Embed)
            image_embedding = create_image_content_embedding(analysis_result, image_data)
            location_embedding = create_location_embedding(report['latitude'], report['longitude'])
            
            # Insert analysis results for non-garbage
            cursor.execute(
                """
                INSERT INTO analysis_results (
                    report_id, analyzed_date, waste_type_id, confidence_score,
                    estimated_volume, severity_score, priority_level,
                    analysis_notes, full_description, processed_by,
                    image_embedding, location_embedding
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    report_id,
                    datetime.now(),
                    waste_type_id,
                    analysis_result.get("waste_detection_confidence", 90.0),
                    0.0,  # Zero volume for non-garbage
                    1,    # Lowest severity
                    "low", # Lowest priority
                    "This image does not contain waste material.",
                    analysis_result.get("full_description", "This image does not contain waste material."),
                    'Nova AI',
                    json.dumps(image_embedding) if image_embedding else None,
                    json.dumps(location_embedding) if location_embedding else None
                )
            )
            connection.commit()
            
            # Log the activity
            cursor.execute(
                """
                INSERT INTO system_logs (agent, action, details, related_id, related_table)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    'api_server',
                    'report_analyzed',
                    f"Report {report_id} analyzed: Not Garbage",
                    report_id,
                    'reports'
                )
            )
            connection.commit()
            
            # Check for hotspots (reports nearby) - for Not Garbage reports too
            logger.info(f"Checking for hotspots near report {report_id} (Not Garbage)")
            hotspot_result = check_and_create_hotspots(cursor, connection, report, report_id, analysis_result)
            
            cursor.close()
            connection.close()
            
            return {
                "success": True,
                "message": f"Report {report_id} analyzed successfully: Not Garbage",
                "analysis": analysis_result,
                "hotspot": hotspot_result
            }
        
        # If image contains garbage, continue with normal analysis flow
        # Set the AI-generated short description
        short_description = analysis_result.get("short_description", "")
        
        # Make sure it's 8 words or less
        if short_description and len(short_description.split()) > 8:
            short_description = " ".join(short_description.split()[:8])
        
        # Fallback if no description is available
        if not short_description:
            short_description = f"{analysis_result['waste_type']} waste"
        
        # Update the report with the short description
        cursor.execute(
            "UPDATE reports SET description = %s, status = %s WHERE report_id = %s",
            (short_description, "analyzed", report_id)
        )
        connection.commit()
        
        # Get waste type ID
        cursor.execute(
            "SELECT waste_type_id FROM waste_types WHERE name = %s",
            (analysis_result['waste_type'],)
        )
        waste_type_result = cursor.fetchone()
        
        waste_type_id = None
        if waste_type_result:
            waste_type_id = waste_type_result['waste_type_id']
        else:
            # If waste type doesn't exist, create it
            cursor.execute(
                """
                INSERT INTO waste_types (name, description, hazard_level, recyclable)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    analysis_result['waste_type'],
                    f"Auto-generated waste type for {analysis_result['waste_type']}",
                    'medium',  # Default hazard level
                    False      # Default not recyclable
                )
            )
            connection.commit()
            waste_type_id = cursor.lastrowid
        
        # Generate embeddings for waste images (pass image_data for Titan Image Embed)
        image_embedding = create_image_content_embedding(analysis_result, image_data)
        location_embedding = create_location_embedding(report['latitude'], report['longitude'])
        
        # Insert analysis results
        cursor.execute(
            """
            INSERT INTO analysis_results (
                report_id, analyzed_date, waste_type_id, confidence_score,
                estimated_volume, severity_score, priority_level,
                analysis_notes, full_description, processed_by,
                image_embedding, location_embedding
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                report_id,
                datetime.now(),
                waste_type_id,
                analysis_result.get("waste_detection_confidence", 90.0),
                extract_volume_number(analysis_result.get('estimated_volume', '0')),
                analysis_result['severity_score'],
                analysis_result['priority_level'],
                analysis_result.get('analysis_notes', ''),
                analysis_result.get('full_description', 'No detailed description available.'),
                'Nova AI',
                json.dumps(image_embedding) if image_embedding else None,
                json.dumps(location_embedding) if location_embedding else None
            )
        )
        connection.commit()
        
        # Check for hotspots (reports nearby) - for actual waste reports
        logger.info(f"Checking for hotspots near report {report_id} (Actual Waste)")
        hotspot_result = check_and_create_hotspots(cursor, connection, report, report_id, analysis_result)
        
        # Log the activity
        cursor.execute(
            """
            INSERT INTO system_logs (agent, action, details, related_id, related_table)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                'api_server',
                'report_analyzed',
                f"Report {report_id} analyzed",
                report_id,
                'reports'
            )
        )
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return {
            "success": True,
            "message": f"Report {report_id} analyzed successfully",
            "analysis": analysis_result
        }
        
    except Exception as e:
        logger.error(f"Error processing report {report_id}: {e}")
        return {"success": False, "message": f"Error processing report: {str(e)}"}

# API Routes

# Health check endpoint
@app.get("/health", response_model=dict)
async def health_check():
    try:
        # Check database connection
        connection = get_db_connection()
        if not connection:
            return {
                "status": "error",
                "message": "Database connection failed",
                "service": "EcoLafaek API",
                "version": "1.0.0"
            }
            
        cursor = connection.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        connection.close()
        
        # Return service status
        return {
            "status": "ok",
            "service": "EcoLafaek API",
            "version": "1.0.0",
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "error",
            "message": str(e),
            "service": "EcoLafaek API",
            "version": "1.0.0"
        }

# Authentication routes
@app.get("/api/auth/check-existing", response_model=dict)
async def check_existing_user(email: str = None, username: str = None):
    """Check if username or email already exists - helps users before registration"""
    try:
        if not email and not username:
            raise HTTPException(status_code=400, detail="Either email or username is required")
            
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        conditions = []
        params = []
        
        if email:
            conditions.append("email = %s")
            params.append(email)
        if username:
            conditions.append("username = %s") 
            params.append(username)
            
        where_clause = " OR ".join(conditions)
        
        cursor.execute(
            f"SELECT username, email FROM users WHERE {where_clause}",
            params
        )
        existing_user = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if existing_user:
            return {
                "status": "exists",
                "message": "User account found",
                "suggestion": "Try logging in instead of registering",
                "existing_username": existing_user['username'],
                "existing_email": existing_user['email']
            }
        else:
            return {
                "status": "available", 
                "message": "Username/email is available for registration"
            }
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Check existing user error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Improved registration endpoint with better logging
@app.post("/api/auth/register", response_model=dict)
@limiter.limit("5/minute")  # Rate limit registration to prevent spam
async def register(user_data: UserCreate, request: Request):
    try:
        logger.info(f"Registration attempt for username: {user_data.username}, email: {user_data.email}")
        
        # Check if username or email already exists in users table
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT user_id, username, email FROM users WHERE username = %s OR email = %s",
            (user_data.username, user_data.email)
        )
        existing_user = cursor.fetchone()
        
        if existing_user:
            logger.warning(f"User already exists: {existing_user}")
            cursor.close()
            connection.close()
            # More specific error message
            if existing_user['username'] == user_data.username and existing_user['email'] == user_data.email:
                raise HTTPException(status_code=409, detail="Both username and email already exist in users table")
            elif existing_user['username'] == user_data.username:
                raise HTTPException(status_code=409, detail="Username already exists in users table")
            else:
                raise HTTPException(status_code=409, detail="Email already exists in users table")
        
        # Check if username or email exists in pending registrations
        cursor.execute(
            "SELECT registration_id, username, email, expires_at FROM pending_registrations WHERE username = %s OR email = %s",
            (user_data.username, user_data.email)
        )
        existing_pending = cursor.fetchone()
        
        if existing_pending:
            logger.info(f"Found pending registration: {existing_pending}")
            
            # Check if expired - if so, delete it
            now = datetime.now()
            if existing_pending['expires_at'] < now:
                logger.info(f"Deleting expired pending registration: {existing_pending['registration_id']}")
                cursor.execute(
                    "DELETE FROM pending_registrations WHERE registration_id = %s",
                    (existing_pending['registration_id'],)
                )
                connection.commit()
                existing_pending = None  # Treat as if no pending registration
            else:
                # Not expired - check if it's the same user
                if (existing_pending['username'] == user_data.username and 
                    existing_pending['email'] == user_data.email):
                    logger.info("Same user re-registering, updating existing pending registration")
                    # Same user re-registering - this is OK, we'll update below
                else:
                    # Different user with conflicting credentials
                    cursor.close()
                    connection.close()
                    if existing_pending['username'] == user_data.username:
                        raise HTTPException(status_code=409, detail="Username is already being registered by another user")
                    else:
                        raise HTTPException(status_code=409, detail="Email is already being registered by another user")
        
        # Generate OTP
        otp = generate_otp()
        expires_at = datetime.now() + timedelta(minutes=10)
        
        # Hash the password
        hashed_password = hash_password(user_data.password)
        
        if existing_pending:
            # Update existing pending registration (same user re-registering)
            logger.info(f"Updating pending registration: {existing_pending['registration_id']}")
            cursor.execute(
                """
                UPDATE pending_registrations 
                SET username = %s, email = %s, phone_number = %s, password_hash = %s, 
                    otp = %s, created_at = %s, expires_at = %s, attempts = 0
                WHERE registration_id = %s
                """,
                (user_data.username, user_data.email, user_data.phone_number, hashed_password, 
                 otp, datetime.now(), expires_at, existing_pending['registration_id'])
            )
        else:
            # Create new pending registration
            logger.info("Creating new pending registration")
            cursor.execute(
                """
                INSERT INTO pending_registrations 
                (username, email, phone_number, password_hash, otp, created_at, expires_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (user_data.username, user_data.email, user_data.phone_number, hashed_password, otp, datetime.now(), expires_at)
            )
        
        connection.commit()
        
        # Send OTP email
        email_subject = "EcoLafaek - Verify Your Email"
        email_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #4CAF50;">EcoLafaek - Email Verification</h2>
                <p>Hello {user_data.username},</p>
                <p>Thank you for registering with EcoLafaek. To complete your registration, please use the following verification code:</p>
                <div style="background-color: #f6f6f6; padding: 12px; text-align: center; border-radius: 5px; margin: 20px 0; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
                    {otp}
                </div>
                <p>This code is valid for 10 minutes. If you don't verify within this time, you'll need to register again.</p>
                <p>If you did not request this registration, please ignore this email.</p>
                <p>Thank you,<br>EcoLafaek Team</p>
            </div>
        </body>
        </html>
        """
        
        # For development, log the OTP (remove in production)
        logger.info(f"OTP for {user_data.email}: {otp}")
        
        # Send the actual email
        email_sent = send_email(user_data.email, email_subject, email_body)
        cursor.close()
        connection.close()
        
        if not email_sent:
            # Continue anyway but inform the user they may not receive the email
            logger.warning(f"Failed to send verification email to {user_data.email}")
        
        logger.info(f"Registration successful for {user_data.username}")
        return {
            "status": "success",
            "message": "Registration initiated. Please verify your email.",
            "email": user_data.email,
            "username": user_data.username,
            "expires_at": expires_at.strftime('%Y-%m-%d %H:%M:%S'),
            "otp": otp  # Include for development only, remove in production
        }
        
    except HTTPException as e:
        logger.error(f"Registration HTTPException: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add a force cleanup endpoint
@app.delete("/api/auth/force-cleanup", response_model=dict)
async def force_cleanup_all_registrations():
    """DANGER: Force cleanup all pending registrations - USE WITH CAUTION"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Delete ALL pending registrations
        cursor.execute("DELETE FROM pending_registrations")
        deleted_count = cursor.rowcount
        connection.commit()
        cursor.close()
        connection.close()
        
        logger.info(f"Force cleaned up {deleted_count} pending registrations")
        return {
            "status": "success",
            "message": f"Force cleaned up {deleted_count} pending registrations"
        }
        
    except Exception as e:
        logger.error(f"Force cleanup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/auth/verify-registration", response_model=TokenData)
async def verify_registration(verification: OTPVerify):
    try:
        # Get pending registration details
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            """
            SELECT * FROM pending_registrations
            WHERE email = %s AND otp = %s
            """,
            (verification.email, verification.otp)
        )
        
        pending = cursor.fetchone()
        
        if not pending:
            cursor.execute(
                """
                SELECT * FROM pending_registrations
                WHERE email = %s
                """,
                (verification.email,)
            )
            
            wrong_otp_pending = cursor.fetchone()
            
            if wrong_otp_pending:
                # Increment attempts
                cursor.execute(
                    "UPDATE pending_registrations SET attempts = attempts + 1 WHERE registration_id = %s",
                    (wrong_otp_pending['registration_id'],)
                )
                connection.commit()
                
                # Check if too many attempts
                if wrong_otp_pending['attempts'] >= 3:
                    cursor.execute(
                        "DELETE FROM pending_registrations WHERE registration_id = %s",
                        (wrong_otp_pending['registration_id'],)
                    )
                    connection.commit()
                    cursor.close()
                    connection.close()
                    raise HTTPException(status_code=400, detail="Too many failed attempts. Please register again.")
                
                cursor.close()
                connection.close()
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid OTP. Please try again. Attempts left: {3 - wrong_otp_pending['attempts']}"
                )
            
            cursor.close()
            connection.close()
            raise HTTPException(status_code=404, detail="Invalid verification details or OTP expired")
        
        # Check if OTP has expired
        now = datetime.now()
        if pending['expires_at'] < now:
            # Delete expired registration
            cursor.execute(
                "DELETE FROM pending_registrations WHERE registration_id = %s",
                (pending['registration_id'],)
            )
            connection.commit()
            cursor.close()
            connection.close()
            raise HTTPException(status_code=400, detail="OTP has expired. Please register again.")
        
        # OTP is valid - create the actual user
        cursor.execute(
            """
            INSERT INTO users 
            (username, email, phone_number, password_hash, registration_date, account_status, verification_status) 
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (pending['username'], pending['email'], pending['phone_number'], 
             pending['password_hash'], datetime.now(), 'active', True)
        )
        
        user_id = cursor.lastrowid
        connection.commit()
        
        # Delete pending registration
        cursor.execute(
            "DELETE FROM pending_registrations WHERE registration_id = %s",
            (pending['registration_id'],)
        )
        connection.commit()
        
        # Get user details
        cursor.execute(
            """
            SELECT user_id, username, email, phone_number, registration_date, 
                   account_status, profile_image_url, verification_status
            FROM users WHERE user_id = %s
            """,
            (user_id,)
        )
        
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        # Convert datetime objects to strings
        if user:
            for key, value in user.items():
                if isinstance(value, datetime):
                    user[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        # Generate token
        token = generate_token(user_id)
        
        return {
            "status": "success",
            "message": "Registration completed successfully",
            "token": token,
            "user": user
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login", response_model=TokenData)
@limiter.limit("10/minute")  # Rate limit login attempts
async def login(login_data: UserLogin, request: Request):
    try:
        # Get user by username
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            """
            SELECT user_id, username, email, phone_number, password_hash, registration_date, 
                   last_login, account_status, profile_image_url, verification_status
            FROM users WHERE username = %s
            """,
            (login_data.username,)
        )
        
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            connection.close()
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Verify password
        if not verify_password(user['password_hash'], login_data.password):
            cursor.close()
            connection.close()
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Update last login time
        cursor.execute(
            "UPDATE users SET last_login = %s WHERE user_id = %s",
            (datetime.now(), user['user_id'])
        )
        connection.commit()
        
        cursor.close()
        connection.close()
        
        # Remove password hash from user object
        user.pop('password_hash', None)
        
        # Convert datetime objects to strings
        for key, value in user.items():
            if isinstance(value, datetime):
                user[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        # Generate token
        token = generate_token(user['user_id'])
        
        return {
            "status": "success",
            "message": "Login successful",
            "token": token,
            "user": user
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/send-otp", response_model=dict)
async def send_otp(otp_request: OTPRequest):
    try:
        # Validate required fields
        email = otp_request.email
        username = otp_request.username
        
        # If OTP is provided in the request, use it (for testing)
        # Otherwise generate a new one
        otp = otp_request.otp or generate_otp()
        
        # Get user ID
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT user_id FROM users WHERE email = %s",
            (email,)
        )
        
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            connection.close()
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = user['user_id']
        
        # Set expiration time (10 minutes from now)
        expires_at = datetime.now() + timedelta(minutes=10)
        
        # Check if there's an existing OTP for this user
        cursor.execute(
            "SELECT verification_id FROM user_verifications WHERE user_id = %s AND is_verified = FALSE",
            (user_id,)
        )
        
        existing_verification = cursor.fetchone()
        
        if existing_verification:
            # Update existing verification
            cursor.execute(
                """
                UPDATE user_verifications 
                SET otp = %s, created_at = %s, expires_at = %s, attempts = 0
                WHERE verification_id = %s
                """,
                (otp, datetime.now(), expires_at, existing_verification['verification_id'])
            )
        else:
            # Create new verification
            cursor.execute(
                """
                INSERT INTO user_verifications 
                (user_id, email, otp, created_at, expires_at)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (user_id, email, otp, datetime.now(), expires_at)
            )
        
        connection.commit()
        
        # Prepare email content
        email_subject = "Your OTP Verification Code - EcoLafaek"
        email_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #4CAF50;">EcoLafaek - Email Verification</h2>
                <p>Hello {username},</p>
                <p>Your one-time password (OTP) for EcoLafaek account verification is:</p>
                <div style="background-color: #f6f6f6; padding: 12px; text-align: center; border-radius: 5px; margin: 20px 0; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
                    {otp}
                </div>
                <p>This code is valid for 10 minutes.</p>
                <p>If you did not request this code, please ignore this email.</p>
                <p>Thank you,<br>EcoLafaek Team</p>
            </div>
        </body>
        </html>
        """
        
        # For development, log the OTP
        logger.info(f"OTP for {email}: {otp}")
        
        # Send the email
        email_sent = send_email(email, email_subject, email_body)
        
        cursor.close()
        connection.close()
        
        if email_sent:
            return {
                "status": "success",
                "message": "OTP sent successfully",
                "otp": otp,  # Include OTP in response for development only
                "expires_at": expires_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        else:
            return {
                "status": "error", 
                "message": "Failed to send OTP email but code was generated",
                "otp": otp  # Include OTP in response for development only
            }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Send OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/verify-otp", response_model=TokenData)
async def verify_otp(verification: OTPVerify):
    try:
        # Get verification details
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            """
            SELECT v.*, u.user_id, u.username
            FROM user_verifications v
            JOIN users u ON v.user_id = u.user_id
            WHERE v.email = %s AND v.is_verified = FALSE
            ORDER BY v.created_at DESC
            LIMIT 1
            """,
            (verification.email,)
        )
        
        verification_record = cursor.fetchone()
        
        if not verification_record:
            cursor.close()
            connection.close()
            raise HTTPException(status_code=404, detail="No pending verification found")
        
        # Check if OTP has expired
        now = datetime.now()
        if verification_record['expires_at'] < now:
            cursor.close()
            connection.close()
            raise HTTPException(status_code=400, detail="OTP has expired")
        
        # Update attempt count
        cursor.execute(
            "UPDATE user_verifications SET attempts = attempts + 1 WHERE verification_id = %s",
            (verification_record['verification_id'],)
        )
        connection.commit()
        
        # Check if OTP matches
        if verification_record['otp'] != verification.otp:
            # If too many attempts, mark as expired
            if verification_record['attempts'] >= 3:
                cursor.execute(
                    "UPDATE user_verifications SET expires_at = %s WHERE verification_id = %s",
                    (now - timedelta(minutes=1), verification_record['verification_id'])
                )
                connection.commit()
                cursor.close()
                connection.close()
                raise HTTPException(status_code=400, detail="Too many failed attempts, OTP is now expired")
            
            cursor.close()
            connection.close()
            raise HTTPException(
                status_code=400,
                detail=f"Invalid OTP. Attempts left: {3 - verification_record['attempts']}"
            )
        
        # OTP is valid - mark as verified
        cursor.execute(
            "UPDATE user_verifications SET is_verified = TRUE WHERE verification_id = %s",
            (verification_record['verification_id'],)
        )
        
        # Update user's verification status
        cursor.execute(
            "UPDATE users SET verification_status = TRUE WHERE user_id = %s",
            (verification_record['user_id'],)
        )
        connection.commit()
        
        # Generate token for user
        token = generate_token(verification_record['user_id'])
        
        # Get updated user data
        cursor.execute(
            """
            SELECT user_id, username, email, phone_number, registration_date, 
                   last_login, account_status, profile_image_url, verification_status
            FROM users WHERE user_id = %s
            """,
            (verification_record['user_id'],)
        )
        
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        # Convert datetime objects to strings
        if user:
            for key, value in user.items():
                if isinstance(value, datetime):
                    user[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        return {
            "status": "success",
            "message": "Email verified successfully",
            "token": token,
            "user": user
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Verify OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/resend-otp", response_model=dict)
async def resend_otp(request: ResendOTPRequest):
    try:
        email = request.email
        
        # Get user details
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT user_id, username FROM users WHERE email = %s",
            (email,)
        )
        
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            connection.close()
            raise HTTPException(status_code=404, detail="User not found for this email")
        
        # Generate new OTP
        otp = generate_otp()
        expires_at = datetime.now() + timedelta(minutes=10)
        
        # Check if there's an existing OTP for this user
        cursor.execute(
            "SELECT verification_id FROM user_verifications WHERE user_id = %s AND is_verified = FALSE",
            (user['user_id'],)
        )
        
        existing_verification = cursor.fetchone()
        
        if existing_verification:
            # Update existing verification
            cursor.execute(
                """
                UPDATE user_verifications 
                SET otp = %s, created_at = %s, expires_at = %s, attempts = 0
                WHERE verification_id = %s
                """,
                (otp, datetime.now(), expires_at, existing_verification['verification_id'])
            )
        else:
            # Create new verification
            cursor.execute(
                """
                INSERT INTO user_verifications 
                (user_id, email, otp, created_at, expires_at)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (user['user_id'], email, otp, datetime.now(), expires_at)
            )
        
        connection.commit()
        
        # Send OTP email
        email_subject = "EcoLafaek - New Verification Code"
        email_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #4CAF50;">EcoLafaek - New Verification Code</h2>
                <p>Hello {user['username']},</p>
                <p>You requested a new verification code. Please use the following code to complete your verification:</p>
                <div style="background-color: #f6f6f6; padding: 12px; text-align: center; border-radius: 5px; margin: 20px 0; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
                    {otp}
                </div>
                <p>This code is valid for 10 minutes. If you don't verify within this time, you'll need to request a new code.</p>
                <p>If you did not request this code, please ignore this email.</p>
                <p>Thank you,<br>EcoLafaek Team</p>
            </div>
        </body>
        </html>
        """
        
        # For development, log the OTP
        logger.info(f"Resent OTP for {email}: {otp}")
        
        # Send the email
        email_sent = send_email(email, email_subject, email_body)
        
        cursor.close()
        connection.close()
        
        if email_sent:
            return {
                "status": "success",
                "message": "New OTP sent successfully",
                "otp": otp,  # Include OTP in response for development only
                "expires_at": expires_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        else:
            return {
                "status": "error", 
                "message": "Failed to send OTP email but code was generated",
                "otp": otp  # Include OTP in response for development only
            }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Resend OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
@app.post("/api/auth/change-password", response_model=dict)
async def change_password(password_data: ChangePassword, user_id: int = Depends(get_user_from_token)):
    try:
        # Get user's current password hash
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT password_hash FROM users WHERE user_id = %s",
            (user_id,)
        )
        
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            connection.close()
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not verify_password(user['password_hash'], password_data.current_password):
            cursor.close()
            connection.close()
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        
        # Update password
        new_password_hash = hash_password(password_data.new_password)
        
        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE user_id = %s",
            (new_password_hash, user_id)
        )
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return {
            "status": "success",
            "message": "Password changed successfully"
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Change password error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/users/{user_id}", response_model=dict)
async def update_user(user_id: int, update_data: UpdateUserProfile, current_user_id: int = Depends(get_user_from_token)):
    try:
        # Check if the requesting user is authorized to update this profile
        if int(current_user_id) != user_id:
            raise HTTPException(status_code=403, detail="Access denied. You can only update your own profile")
        
        # Check if there are any fields to update
        update_fields = {}
        if update_data.email is not None:
            update_fields["email"] = update_data.email
        if update_data.phone_number is not None:
            update_fields["phone_number"] = update_data.phone_number
        if update_data.profile_image_url is not None:
            update_fields["profile_image_url"] = update_data.profile_image_url
            
        if not update_fields:
            raise HTTPException(status_code=400, detail="No valid fields to update")
            
        # Construct the SQL SET clause for the fields to update
        set_clause = ", ".join([f"{field} = %s" for field in update_fields.keys()])
        values = list(update_fields.values())
        values.append(user_id)  # Add user_id for the WHERE clause
        
        # Update the user profile
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            f"UPDATE users SET {set_clause} WHERE user_id = %s",
            values
        )
        connection.commit()
        
        # Get the updated user data
        cursor.execute(
            """
            SELECT user_id, username, email, phone_number, registration_date, 
                   last_login, account_status, profile_image_url, verification_status
            FROM users 
            WHERE user_id = %s
            """,
            (user_id,)
        )
        
        updated_user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        # Convert datetime objects to strings
        if updated_user:
            for key, value in updated_user.items():
                if isinstance(value, datetime):
                    updated_user[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        return {
            "status": "success",
            "message": "User profile updated successfully",
            "user": updated_user
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Update user profile error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/{user_id}", response_model=dict)
async def get_user(user_id: int, current_user_id: int = Depends(get_user_from_token)):
    try:
        # Check if the requesting user is authorized
        if int(current_user_id) != user_id:
            raise HTTPException(status_code=403, detail="Access denied. You can only view your own profile")
        
        # Get user details
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            """
            SELECT user_id, username, email, phone_number, registration_date, 
                   last_login, account_status, profile_image_url, verification_status
            FROM users WHERE user_id = %s
            """,
            (user_id,)
        )
        
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Convert datetime objects to strings
        for key, value in user.items():
            if isinstance(value, datetime):
                user[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        return {
            "status": "success",
            "user": user
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Get user error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Report submission and processing
@app.post("/api/reports", response_model=dict)
@limiter.limit("20/hour")  # Rate limit report submissions
async def submit_report(report_data: ReportCreate, background_tasks: BackgroundTasks, request: Request, user_id: int = Depends(get_user_from_token)):
    try:
        # Validate user permissions (check if user_id matches authenticated user)
        if user_id != report_data.user_id:
            raise HTTPException(status_code=403, detail="You can only submit reports for your own account")
        
        # Process image if provided
        image_url = None
        if report_data.image_data:
            # Generate a unique filename
            filename = f"report_{int(time.time())}_{report_data.user_id}.jpg"
            image_url = upload_image_to_s3(report_data.image_data, filename)
            
            if not image_url:
                raise HTTPException(status_code=500, detail="Failed to upload image")
        
        # Insert report into database
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Determine location_id if available
        location_id = None
        if report_data.latitude and report_data.longitude:
            # Find nearest location within 1km
            cursor.execute("""
                SELECT location_id 
                FROM locations 
                WHERE 
                    (6371 * acos(cos(radians(%s)) * cos(radians(latitude)) * 
                    cos(radians(longitude) - radians(%s)) + 
                    sin(radians(%s)) * sin(radians(latitude)))) < 1
                ORDER BY
                    (6371 * acos(cos(radians(%s)) * cos(radians(latitude)) * 
                    cos(radians(longitude) - radians(%s)) + 
                    sin(radians(%s)) * sin(radians(latitude)))) ASC
                LIMIT 1
            """, (report_data.latitude, report_data.longitude, report_data.latitude, 
                  report_data.latitude, report_data.longitude, report_data.latitude))
            result = cursor.fetchone()
            if result:
                location_id = result[0]
        
        # Insert report
        device_info_json = json.dumps(report_data.device_info) if report_data.device_info else None
        
        cursor.execute("""
            INSERT INTO reports 
            (user_id, latitude, longitude, location_id, description, status, image_url, device_info) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            report_data.user_id, 
            report_data.latitude, 
            report_data.longitude, 
            location_id, 
            report_data.description, 
            'submitted',
            image_url,
            device_info_json
        ))
        
        report_id = cursor.lastrowid
        
        # Add entry to image processing queue if there's an image
        if image_url:
            cursor.execute(
                "INSERT INTO image_processing_queue (report_id, image_url) VALUES (%s, %s)",
                (report_id, image_url)
            )
        
        # Log the activity
        cursor.execute(
            "INSERT INTO system_logs (agent, action, details, related_id, related_table) VALUES (%s, %s, %s, %s, %s)",
            ('api_server', 'report_created', f'New waste report submitted by user {report_data.user_id}', report_id, 'reports')
        )
        
        connection.commit()
        cursor.close()
        connection.close()
        
        # Process report with image analysis if an image was provided
        notification_message = "No image provided, analysis skipped"
        if image_url:
            # Schedule background task to process the report
            background_tasks.add_task(process_report, report_id, background_tasks)
            notification_message = "Report queued for analysis"
        
        return {
            "status": "success", 
            "message": f"Report submitted successfully. {notification_message}",
            "report_id": report_id
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in submit_report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reports/{report_id}", response_model=dict)
async def get_report(report_id: int, user_id: int = Depends(get_user_from_token)):
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # First check if the report exists and if the user has permission to view it
        cursor.execute(
            "SELECT user_id FROM reports WHERE report_id = %s",
            (report_id,)
        )
        
        report_owner = cursor.fetchone()
        if not report_owner:
            cursor.close()
            connection.close()
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Allow access if it's the user's own report
        if report_owner['user_id'] != user_id:
            cursor.close()
            connection.close()
            raise HTTPException(status_code=403, detail="Access denied. You can only view your own reports.")
        
        # Get the full report details
        query = """
            SELECT r.*, a.severity_score, a.priority_level, a.full_description, w.name as waste_type
            FROM reports r
            LEFT JOIN analysis_results a ON r.report_id = a.report_id
            LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
            WHERE r.report_id = %s
        """
        
        cursor.execute(query, (report_id,))
        report = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        # Convert datetime objects to strings
        if report:
            for key, value in report.items():
                if isinstance(value, datetime):
                    report[key] = value.strftime('%Y-%m-%d %H:%M:%S')
            
        return {"status": "success", "report": report}
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in get_report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/reports/{report_id}", response_model=dict)
async def delete_report(report_id: int, user_id: int = Depends(get_user_from_token)):
    try:
        # Connect to the database
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Check if the report exists and belongs to the user
        cursor.execute("SELECT user_id FROM reports WHERE report_id = %s", (report_id,))
        report = cursor.fetchone()

        if not report:
            cursor.close()
            connection.close()
            raise HTTPException(status_code=404, detail="Report not found")

        if int(report['user_id']) != int(user_id):
            cursor.close()
            connection.close()
            raise HTTPException(status_code=403, detail="Access denied. You can only delete your own reports.")

        # Handle hotspot count decrements before deleting
        # First, get all hotspots that include this report
        cursor.execute(
            """
            SELECT h.hotspot_id, h.total_reports
            FROM hotspots h
            JOIN hotspot_reports hr ON h.hotspot_id = hr.hotspot_id
            WHERE hr.report_id = %s
            """,
            (report_id,)
        )
        affected_hotspots = cursor.fetchall()
        
        # Update or delete hotspots based on remaining report count
        for hotspot in affected_hotspots:
            hotspot_id = hotspot['hotspot_id']
            new_count = hotspot['total_reports'] - 1
            
            if new_count < 3:  # Below minimum threshold - delete hotspot
                logger.info(f"Deleting hotspot {hotspot_id} - report count below threshold ({new_count})")
                cursor.execute("DELETE FROM hotspot_reports WHERE hotspot_id = %s", (hotspot_id,))
                cursor.execute("DELETE FROM hotspots WHERE hotspot_id = %s", (hotspot_id,))
            else:  # Update count and recalculate average severity
                logger.info(f"Updating hotspot {hotspot_id} - new count: {new_count}")
                cursor.execute(
                    """
                    UPDATE hotspots 
                    SET total_reports = %s
                    WHERE hotspot_id = %s
                    """,
                    (new_count, hotspot_id)
                )
                
                # Recalculate average severity (excluding the report being deleted)
                cursor.execute(
                    """
                    SELECT AVG(ar.severity_score) as avg_severity
                    FROM hotspot_reports hr
                    JOIN analysis_results ar ON hr.report_id = ar.report_id
                    WHERE hr.hotspot_id = %s AND hr.report_id != %s
                    """,
                    (hotspot_id, report_id)
                )
                
                avg_result = cursor.fetchone()
                if avg_result and avg_result['avg_severity'] is not None:
                    cursor.execute(
                        """
                        UPDATE hotspots
                        SET average_severity = %s
                        WHERE hotspot_id = %s
                        """,
                        (avg_result['avg_severity'], hotspot_id)
                    )

        # Delete from related tables in correct order
        cursor.execute("DELETE FROM hotspot_reports WHERE report_id = %s", (report_id,))
        cursor.execute("DELETE FROM image_processing_queue WHERE report_id = %s", (report_id,))
        cursor.execute(
            """DELETE rw FROM report_waste_types rw 
               JOIN analysis_results a ON rw.analysis_id = a.analysis_id 
               WHERE a.report_id = %s""",
            (report_id,)
        )
        cursor.execute("DELETE FROM analysis_results WHERE report_id = %s", (report_id,))
        cursor.execute("DELETE FROM reports WHERE report_id = %s", (report_id,))

        # Commit changes
        connection.commit()
        cursor.close()
        connection.close()

        return {"status": "success", "message": "Report deleted successfully"}

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Delete report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reports", response_model=dict)
async def get_reports(
    status: Optional[str] = None,
    waste_type: Optional[str] = None,
    page: int = 1,
    per_page: int = 10,
    user_id: int = Depends(get_user_from_token)
):
    try:
        # Build query conditions
        conditions = ["r.user_id = %s"]  # Only show the user's own reports
        params = [user_id]
        
        if status:
            conditions.append("r.status = %s")
            params.append(status)
        
        if waste_type:
            conditions.append("w.name = %s")
            params.append(waste_type)
        
        where_clause = " AND ".join(conditions)
        
        # Calculate offset for pagination
        offset = (page - 1) * per_page
        
        # Get reports
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get total count
        count_query = f"""
            SELECT COUNT(*) as count
            FROM reports r
            LEFT JOIN analysis_results a ON r.report_id = a.report_id
            LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
            WHERE {where_clause}
        """
        
        cursor.execute(count_query, params)
        count_result = cursor.fetchone()
        total_reports = count_result['count'] if count_result else 0

        # Get status counts for the user
        status_query = """
            SELECT
                status,
                COUNT(*) as count
            FROM reports
            WHERE user_id = %s
            GROUP BY status
        """
        cursor.execute(status_query, [user_id])
        status_results = cursor.fetchall()

        # Build status counts dictionary
        status_counts = {
            'submitted': 0,
            'analyzing': 0,
            'analyzed': 0
        }
        for row in status_results:
            status_counts[row['status']] = row['count']

        # Get reports with pagination
        report_query = f"""
            SELECT r.*, a.severity_score, a.priority_level, w.name as waste_type
            FROM reports r
            LEFT JOIN analysis_results a ON r.report_id = a.report_id
            LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
            WHERE {where_clause}
            ORDER BY r.report_date DESC
            LIMIT %s OFFSET %s
        """
        
        cursor.execute(report_query, params + [per_page, offset])
        reports = cursor.fetchall()
        cursor.close()
        connection.close()

        # Convert datetime objects to strings
        for report in reports:
            if 'report_date' in report and report['report_date']:
                report['report_date'] = report['report_date'].strftime('%Y-%m-%d %H:%M:%S')

        return {
            "status": "success",
            "reports": reports,
            "pagination": {
                "total": total_reports,
                "page": page,
                "per_page": per_page,
                "total_pages": (total_reports + per_page - 1) // per_page,
                "status_counts": status_counts
            }
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Get reports error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reports/nearby", response_model=dict)
async def get_nearby_reports(
    lat: float,
    lon: float,
    radius: float = 5.0,
    page: int = 1,
    per_page: int = 10,
    user_id: int = Depends(get_user_from_token)
):
    try:
        # Calculate offset for pagination
        offset = (page - 1) * per_page
        
        # Get nearby reports
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get total count using Haversine formula
        count_query = """
            SELECT COUNT(*) as count
            FROM reports r
            WHERE (
                6371 * acos(
                    cos(radians(%s)) * cos(radians(latitude)) * 
                    cos(radians(longitude) - radians(%s)) + 
                    sin(radians(%s)) * sin(radians(latitude))
                )
            ) < %s
        """
        
        cursor.execute(count_query, (lat, lon, lat, radius))
        count_result = cursor.fetchone()
        total_reports = count_result['count'] if count_result else 0
        
        # Get reports with pagination
        report_query = """
            SELECT r.*, a.severity_score, a.priority_level, w.name as waste_type,
                   (
                       6371 * acos(
                           cos(radians(%s)) * cos(radians(latitude)) * 
                           cos(radians(longitude) - radians(%s)) + 
                           sin(radians(%s)) * sin(radians(latitude))
                       )
                   ) as distance
            FROM reports r
            LEFT JOIN analysis_results a ON r.report_id = a.report_id
            LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
            HAVING distance < %s
            ORDER BY distance
            LIMIT %s OFFSET %s
        """
        
        cursor.execute(report_query, (lat, lon, lat, radius, per_page, offset))
        reports = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Convert datetime objects to strings
        for report in reports:
            if 'report_date' in report and report['report_date']:
                report['report_date'] = report['report_date'].strftime('%Y-%m-%d %H:%M:%S')
        
        return {
            "status": "success",
            "reports": reports,
            "pagination": {
                "total": total_reports,
                "page": page,
                "per_page": per_page,
                "total_pages": (total_reports + per_page - 1) // per_page
            }
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Get nearby reports error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/waste-types", response_model=dict)
async def get_waste_types(user_id: int = Depends(get_user_from_token)):
    try:
        # Get waste types
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute(
            """
            SELECT waste_type_id, name, description, hazard_level, recyclable, icon_url
            FROM waste_types
            ORDER BY name
            """
        )
        
        waste_types = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return {
            "status": "success",
            "waste_types": waste_types
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Get waste types error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/hotspots", response_model=dict)
async def get_hotspots(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius: float = 10.0,
    page: int = 1,
    per_page: int = 10,
    user_id: int = Depends(get_user_from_token)
):
    try:
        # Calculate offset for pagination
        offset = (page - 1) * per_page
        
        # Get hotspots
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        if lat is not None and lon is not None:
            # Get hotspots near a specific location
            count_query = """
                SELECT COUNT(*) as count
                FROM hotspots
                WHERE (
                    6371 * acos(
                        cos(radians(%s)) * cos(radians(center_latitude)) * 
                        cos(radians(center_longitude) - radians(%s)) + 
                        sin(radians(%s)) * sin(radians(center_latitude))
                    )
                ) < %s
            """
            
            cursor.execute(count_query, (lat, lon, lat, radius))
            count_result = cursor.fetchone()
            total_hotspots = count_result['count'] if count_result else 0
            
            # Get hotspots with pagination
            hotspot_query = """
                SELECT h.*,
                       (
                           6371 * acos(
                               cos(radians(%s)) * cos(radians(center_latitude)) * 
                               cos(radians(center_longitude) - radians(%s)) + 
                               sin(radians(%s)) * sin(radians(center_latitude))
                           )
                       ) as distance,
                       l.name as location_name
                FROM hotspots h
                LEFT JOIN locations l ON h.location_id = l.location_id
                HAVING distance < %s
                ORDER BY distance
                LIMIT %s OFFSET %s
            """
            
            cursor.execute(hotspot_query, (lat, lon, lat, radius, per_page, offset))
        else:
            # Get all hotspots with pagination
            count_query = "SELECT COUNT(*) as count FROM hotspots"
            cursor.execute(count_query)
            count_result = cursor.fetchone()
            total_hotspots = count_result['count'] if count_result else 0
            
            hotspot_query = """
                SELECT h.*, l.name as location_name
                FROM hotspots h
                LEFT JOIN locations l ON h.location_id = l.location_id
                ORDER BY h.last_reported DESC
                LIMIT %s OFFSET %s
            """
            
            cursor.execute(hotspot_query, (per_page, offset))
        
        hotspots = cursor.fetchall()
        
        # For each hotspot, get a count of reports
        for hotspot in hotspots:
            cursor.execute(
                "SELECT COUNT(*) as report_count FROM hotspot_reports WHERE hotspot_id = %s",
                (hotspot['hotspot_id'],)
            )
            count_result = cursor.fetchone()
            hotspot['report_count'] = count_result['report_count'] if count_result else 0
            
            # Convert date objects to strings
            for key, value in hotspot.items():
                if isinstance(value, datetime):
                    hotspot[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        cursor.close()
        connection.close()
        
        return {
            "status": "success",
            "hotspots": hotspots,
            "pagination": {
                "total": total_hotspots,
                "page": page,
                "per_page": per_page,
                "total_pages": (total_hotspots + per_page - 1) // per_page
            }
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Get hotspots error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/hotspots/{hotspot_id}/reports", response_model=dict)
async def get_hotspot_reports(
    hotspot_id: int,
    page: int = 1,
    per_page: int = 10,
    user_id: int = Depends(get_user_from_token)
):
    try:
        # Calculate offset for pagination
        offset = (page - 1) * per_page
        
        # Get reports for the hotspot
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get total count
        count_query = """
            SELECT COUNT(*) as count
            FROM hotspot_reports hr
            JOIN reports r ON hr.report_id = r.report_id
            WHERE hr.hotspot_id = %s
        """
        
        cursor.execute(count_query, (hotspot_id,))
        count_result = cursor.fetchone()
        total_reports = count_result['count'] if count_result else 0
        
        # Get reports with pagination
        report_query = """
            SELECT r.*, a.severity_score, a.priority_level, w.name as waste_type
            FROM hotspot_reports hr
            JOIN reports r ON hr.report_id = r.report_id
            LEFT JOIN analysis_results a ON r.report_id = a.report_id
            LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
            WHERE hr.hotspot_id = %s
            ORDER BY r.report_date DESC
            LIMIT %s OFFSET %s
        """
        
        cursor.execute(report_query, (hotspot_id, per_page, offset))
        reports = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Convert datetime objects to strings
        for report in reports:
            if 'report_date' in report and report['report_date']:
                report['report_date'] = report['report_date'].strftime('%Y-%m-%d %H:%M:%S')
        
        return {
            "status": "success",
            "reports": reports,
            "pagination": {
                "total": total_reports,
                "page": page,
                "per_page": per_page,
                "total_pages": (total_reports + per_page - 1) // per_page
            }
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Get hotspot reports error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/statistics", response_model=dict)
async def get_dashboard_statistics(user_id: int = Depends(get_user_from_token)):
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Get user's report counts
        cursor.execute(
            """
            SELECT COUNT(*) as total_reports,
                COUNT(CASE WHEN status = 'analyzed' THEN 1 END) as analyzed_reports,
                COUNT(CASE WHEN status = 'submitted' OR status = 'analyzing' THEN 1 END) as pending_reports,
                COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_reports
            FROM reports
            WHERE user_id = %s
            """,
            (user_id,)
        )
        
        user_stats = cursor.fetchone()
        
        # Get waste type distribution for this user
        cursor.execute(
            """
            SELECT w.name, COUNT(*) as count 
            FROM reports r
            JOIN analysis_results a ON r.report_id = a.report_id
            JOIN waste_types w ON a.waste_type_id = w.waste_type_id
            WHERE r.user_id = %s
            GROUP BY w.name
            ORDER BY count DESC
            """,
            (user_id,)
        )
        
        waste_distribution = cursor.fetchall()
        
        # Get severity distribution 
        cursor.execute(
            """
            SELECT a.severity_score, COUNT(*) as count 
            FROM reports r
            JOIN analysis_results a ON r.report_id = a.report_id
            WHERE r.user_id = %s
            GROUP BY a.severity_score
            ORDER BY a.severity_score
            """,
            (user_id,)
        )
        
        severity_distribution = cursor.fetchall()
        
        # Get priority level distribution
        cursor.execute(
            """
            SELECT a.priority_level, COUNT(*) as count 
            FROM reports r
            JOIN analysis_results a ON r.report_id = a.report_id
            WHERE r.user_id = %s
            GROUP BY a.priority_level
            ORDER BY 
                CASE a.priority_level 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    WHEN 'low' THEN 4 
                END
            """,
            (user_id,)
        )
        
        priority_distribution = cursor.fetchall()
        
        # Get user's reports by month
        cursor.execute(
            """
            SELECT 
                DATE_FORMAT(report_date, '%Y-%m') as month,
                COUNT(*) as count
            FROM reports
            WHERE user_id = %s
            AND report_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(report_date, '%Y-%m')
            ORDER BY month
            """,
            (user_id,)
        )
        
        monthly_reports = cursor.fetchall()
        
        # Get recent reports
        cursor.execute(
            """
            SELECT r.report_id, r.report_date, r.description, r.status, 
                   r.latitude, r.longitude, r.image_url,
                   a.severity_score, a.priority_level, w.name as waste_type
            FROM reports r
            LEFT JOIN analysis_results a ON r.report_id = a.report_id
            LEFT JOIN waste_types w ON a.waste_type_id = w.waste_type_id
            WHERE r.user_id = %s
            ORDER BY r.report_date DESC
            LIMIT 5
            """,
            (user_id,)
        )
        
        recent_reports = cursor.fetchall()
        
        # Convert datetime objects to strings in all results
        for report in recent_reports:
            if 'report_date' in report and report['report_date']:
                report['report_date'] = report['report_date'].strftime('%Y-%m-%d %H:%M:%S')
        
        # Get community statistics (user ranking and total contributors)
        cursor.execute(
            """
            SELECT COUNT(DISTINCT user_id) as total_contributors
            FROM reports
            WHERE user_id IS NOT NULL
            """)
        
        community_result = cursor.fetchone()
        total_contributors = community_result['total_contributors'] if community_result else 0
        
        # Get user's ranking based on total reports
        cursor.execute(
            """
            SELECT ranking 
            FROM (
                SELECT user_id, 
                       COUNT(*) as report_count,
                       RANK() OVER (ORDER BY COUNT(*) DESC) as ranking
                FROM reports 
                WHERE user_id IS NOT NULL
                GROUP BY user_id
            ) ranked_users 
            WHERE user_id = %s
            """,
            (user_id,)
        )
        
        ranking_result = cursor.fetchone()
        user_rank = ranking_result['ranking'] if ranking_result else None
        
        # Create community stats object
        community_stats = {
            'total_contributors': total_contributors,
            'user_rank': user_rank
        }
        
        cursor.close()
        connection.close()
        
        return {
            "status": "success",
            "user_stats": user_stats,
            "waste_distribution": waste_distribution,
            "severity_distribution": severity_distribution,
            "priority_distribution": priority_distribution,
            "monthly_reports": monthly_reports,
            "recent_reports": recent_reports,
            "community_stats": community_stats
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Get dashboard statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/process-queue", response_model=dict)
async def process_queue(background_tasks: BackgroundTasks, user_id: int = Depends(get_user_from_token)):
    """Process the queue of unanalyzed reports"""
    try:
        # Get database connection
        connection = get_db_connection()
        if not connection:
            raise HTTPException(status_code=500, detail="Failed to connect to database")
        
        cursor = connection.cursor(dictionary=True)
        
        # Get unprocessed reports from the queue
        cursor.execute(
            """
            SELECT q.queue_id, q.report_id, q.image_url
            FROM image_processing_queue q
            WHERE q.status = 'pending'
            ORDER BY q.queued_at ASC
            LIMIT 10
            """
        )
        
        queue_items = cursor.fetchall()
        cursor.close()
        connection.close()
        
        if not queue_items:
            return {"status": "success", "message": "No items in the queue", "processed_count": 0}
        
        # Process each queue item in the background
        processed_count = 0
        for item in queue_items:
            # Update queue item status to processing
            connection = get_db_connection()
            cursor = connection.cursor()
            
            cursor.execute(
                """
                UPDATE image_processing_queue
                SET status = 'processing', processed_at = %s
                WHERE queue_id = %s
                """,
                (datetime.now(), item['queue_id'])
            )
            connection.commit()
            cursor.close()
            connection.close()
            
            # Add report to the background processing queue
            background_tasks.add_task(process_report, item['report_id'], background_tasks)
            processed_count += 1
        
        return {
            "status": "success",
            "message": f"{processed_count} reports added to processing queue",
            "processed_count": processed_count
        }
       
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error processing queue: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Vector search helper functions
def invoke_titan_embed_text(text: str) -> Optional[List[float]]:
    """Create embedding for text using Amazon Titan Embed Image (multimodal)"""
    if not embedding_enabled or not text:
        return None

    try:
        # Prepare the request payload for Titan Multimodal Embed with text input and 1024 dimensions
        payload = {
            "inputText": text,
            "embeddingConfig": {
                "outputEmbeddingLength": 1024
            }
        }

        # Use boto3 bedrock_runtime to invoke Titan Embed Image model (supports text too)
        response = bedrock_runtime.invoke_model(
            modelId="amazon.titan-embed-image-v1",
            body=json.dumps(payload)
        )

        result = json.loads(response['body'].read())
        embedding = result.get('embedding', [])
        return embedding if embedding else None
            
    except Exception as e:
        logger.error(f"Error creating text embedding with Titan: {e}")
        return None

def invoke_titan_embed_image(image_data: str) -> Optional[List[float]]:
    """Create embedding for image using Amazon Titan Embed Image"""
    if not embedding_enabled or not image_data:
        return None
    
    try:
        # Prepare the request payload for Titan Image Embed with 1024 dimensions
        payload = {
            "inputImage": image_data,  # base64 encoded image
            "embeddingConfig": {
                "outputEmbeddingLength": 1024
            }
        }

        # Use boto3 bedrock_runtime to invoke Titan Embed Image model
        response = bedrock_runtime.invoke_model(
            modelId="amazon.titan-embed-image-v1",
            body=json.dumps(payload)
        )

        result = json.loads(response['body'].read())
        embedding = result.get('embedding', [])
        return embedding if embedding else None
            
    except Exception as e:
        logger.error(f"Error creating image embedding with Titan: {e}")
        return None

def create_location_embedding(latitude: float, longitude: float) -> Optional[List[float]]:
    """Create embedding for geographic location using Titan Text Embed"""
    if not embedding_enabled:
        return None
    
    try:
        # Create a location description string
        location_text = f"Geographic location at latitude {latitude:.6f} longitude {longitude:.6f}"
        
        # Add contextual information about Timor-Leste regions
        region_context = ""
        if -8.3 <= latitude <= -8.1 and 125.5 <= longitude <= 125.7:
            region_context = " in Dili capital city urban area Timor-Leste"
        elif -8.5 <= latitude <= -8.0 and 125.0 <= longitude <= 127.0:
            region_context = " in northern Timor-Leste coastal region"
        elif -9.0 <= latitude <= -8.5 and 125.0 <= longitude <= 127.0:
            region_context = " in southern Timor-Leste mountainous region"
        else:
            region_context = " in Timor-Leste"
        
        location_text += region_context
        
        # Generate embedding using Titan Text Embed
        return invoke_titan_embed_text(location_text)
    except Exception as e:
        logger.error(f"Error creating location embedding: {e}")
        return None

def create_image_content_embedding(analysis_result: dict, image_data: str = None) -> Optional[List[float]]:
    """Create embedding from image using Titan Embed Image or text analysis"""
    if not embedding_enabled or not analysis_result:
        return None
    
    try:
        # First try to create image embedding if we have image data
        if image_data:
            image_embedding = invoke_titan_embed_image(image_data)
            if image_embedding:
                return image_embedding
        
        # Fallback to text embedding from analysis results
        content_parts = []
        
        if analysis_result.get('waste_type'):
            content_parts.append(f"Waste type: {analysis_result['waste_type']}")
        
        if analysis_result.get('full_description'):
            content_parts.append(f"Description: {analysis_result['full_description']}")
        
        if analysis_result.get('analysis_notes'):
            content_parts.append(f"Analysis: {analysis_result['analysis_notes']}")
        
        if analysis_result.get('environmental_impact'):
            content_parts.append(f"Environmental impact: {analysis_result['environmental_impact']}")
        
        if analysis_result.get('safety_concerns'):
            content_parts.append(f"Safety concerns: {analysis_result['safety_concerns']}")
        
        # Combine all parts
        content_text = " ".join(content_parts)
        
        if not content_text:
            return None
        
        # Generate text embedding using Titan
        return invoke_titan_embed_text(content_text)
        
    except Exception as e:
        logger.error(f"Error creating image content embedding: {e}")
        return None


@app.get("/api/test/nova", response_model=dict)
async def test_nova_api(image_url: str, user_id: int = Depends(get_user_from_token)):
    try:
        # Simple test endpoint to check if the AgentCore/Nova API integration is working
        analysis_result, _ = await analyze_image_with_bedrock(image_url, 0.0, 0.0, "Test image")
        
        if not analysis_result:
            raise HTTPException(status_code=500, detail="Failed to analyze image")
            
        return {
            "status": "success",
            "analysis": analysis_result
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Test Nova API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CHAT API WITH AGENTCORE ====================

# Pydantic models for chat
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    session_id: Optional[str] = None

# Database tool functions for AgentCore
def get_waste_statistics() -> dict:
    """Get overall waste statistics from the database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get total reports
        cursor.execute("SELECT COUNT(*) as total FROM reports")
        total_reports = cursor.fetchone()['total']

        # Get reports by status
        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM reports
            GROUP BY status
        """)
        status_counts = cursor.fetchall()

        # Get reports by waste type
        cursor.execute("""
            SELECT wt.name, COUNT(*) as count
            FROM analysis_results ar
            JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
            GROUP BY wt.name
            ORDER BY count DESC
            LIMIT 10
        """)
        waste_type_counts = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "total_reports": total_reports,
            "status_breakdown": status_counts,
            "top_waste_types": waste_type_counts
        }
    except Exception as e:
        logger.error(f"Error getting waste statistics: {e}")
        return {"error": str(e)}

def search_reports_by_location(district: str = None, limit: int = 10) -> dict:
    """Search waste reports by location"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        if district:
            cursor.execute("""
                SELECT r.report_id, r.latitude, r.longitude, r.report_date,
                       r.description, r.status, r.address_text,
                       ar.severity_score, ar.priority_level, wt.name as waste_type
                FROM reports r
                LEFT JOIN analysis_results ar ON r.report_id = ar.report_id
                LEFT JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
                WHERE r.address_text LIKE %s
                ORDER BY r.report_date DESC
                LIMIT %s
            """, (f'%{district}%', limit))
        else:
            cursor.execute("""
                SELECT r.report_id, r.latitude, r.longitude, r.report_date,
                       r.description, r.status, r.address_text,
                       ar.severity_score, ar.priority_level, wt.name as waste_type
                FROM reports r
                LEFT JOIN analysis_results ar ON r.report_id = ar.report_id
                LEFT JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id
                ORDER BY r.report_date DESC
                LIMIT %s
            """, (limit,))

        reports = cursor.fetchall()
        cursor.close()
        conn.close()

        # Convert Decimal and date/datetime objects to JSON-serializable types
        for report in reports:
            if 'latitude' in report and report['latitude'] is not None:
                report['latitude'] = float(report['latitude'])
            if 'longitude' in report and report['longitude'] is not None:
                report['longitude'] = float(report['longitude'])
            if 'severity_score' in report and report['severity_score'] is not None:
                report['severity_score'] = float(report['severity_score'])
            if 'report_date' in report and report['report_date'] is not None:
                report['report_date'] = report['report_date'].isoformat()

        return {"reports": reports, "count": len(reports)}
    except Exception as e:
        logger.error(f"Error searching reports: {e}")
        return {"error": str(e)}

def get_hotspot_information(limit: int = 10) -> dict:
    """Get information about waste hotspots"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT h.hotspot_id, h.name, h.center_latitude, h.center_longitude,
                   h.total_reports, h.average_severity, h.status, h.first_reported, h.last_reported
            FROM hotspots h
            WHERE h.status = 'active'
            ORDER BY h.average_severity DESC, h.total_reports DESC
            LIMIT %s
        """, (limit,))

        hotspots = cursor.fetchall()
        cursor.close()
        conn.close()

        # Convert Decimal and date objects to JSON-serializable types
        for hotspot in hotspots:
            if 'center_latitude' in hotspot and hotspot['center_latitude'] is not None:
                hotspot['center_latitude'] = float(hotspot['center_latitude'])
            if 'center_longitude' in hotspot and hotspot['center_longitude'] is not None:
                hotspot['center_longitude'] = float(hotspot['center_longitude'])
            if 'average_severity' in hotspot and hotspot['average_severity'] is not None:
                hotspot['average_severity'] = float(hotspot['average_severity'])
            if 'first_reported' in hotspot and hotspot['first_reported'] is not None:
                hotspot['first_reported'] = hotspot['first_reported'].isoformat()
            if 'last_reported' in hotspot and hotspot['last_reported'] is not None:
                hotspot['last_reported'] = hotspot['last_reported'].isoformat()

        return {"hotspots": hotspots, "count": len(hotspots)}
    except Exception as e:
        logger.error(f"Error getting hotspots: {e}")
        return {"error": str(e)}

def get_waste_types_info() -> dict:
    """Get information about waste types and categories"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT waste_type_id, name, description, hazard_level, recyclable
            FROM waste_types
            ORDER BY name
        """)

        waste_types = cursor.fetchall()
        cursor.close()
        conn.close()

        return {"waste_types": waste_types, "count": len(waste_types)}
    except Exception as e:
        logger.error(f"Error getting waste types: {e}")
        return {"error": str(e)}

def execute_sql_query(sql_query: str) -> dict:
    """Execute a READ-ONLY SQL query and return results"""
    try:
        # Security: Only allow SELECT statements
        query_upper = sql_query.strip().upper()
        if not query_upper.startswith('SELECT'):
            return {"error": "Only SELECT queries are allowed for security reasons"}

        # Block dangerous keywords
        dangerous_keywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE']
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                return {"error": f"Query contains forbidden keyword: {keyword}"}

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Execute the query with a limit to prevent large result sets
        if 'LIMIT' not in query_upper:
            sql_query = sql_query.rstrip(';') + ' LIMIT 100'

        cursor.execute(sql_query)
        results = cursor.fetchall()
        cursor.close()
        conn.close()

        # Convert non-serializable types
        for row in results:
            for key, value in row.items():
                if hasattr(value, 'isoformat'):  # datetime/date
                    row[key] = value.isoformat()
                elif isinstance(value, type(Decimal('0'))):  # Decimal
                    row[key] = float(value)

        return {
            "success": True,
            "rows": results,
            "count": len(results),
            "query": sql_query
        }
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error executing SQL query: {error_msg}")

        # Provide helpful error messages for common issues
        helpful_hint = ""
        if "Unknown column" in error_msg and "hotspot_id" in error_msg:
            helpful_hint = " HINT: reports table does not have hotspot_id. Use the hotspot_reports junction table to join reports and hotspots."
        elif "Unknown column" in error_msg:
            helpful_hint = " HINT: Check the column names in the schema. Make sure you're using the correct table aliases."
        elif "table" in error_msg.lower() and "doesn't exist" in error_msg.lower():
            helpful_hint = " HINT: Check the table name spelling and ensure you're only using public tables."

        return {
            "error": error_msg + helpful_hint,
            "success": False,
            "query_attempted": sql_query
        }

@app.post("/api/chat")
@limiter.limit("30/minute")  # Rate limit: 30 requests per minute per IP
async def chat_with_agentcore(chat_request: ChatRequest, request: Request, x_api_key: str = Header(None, alias="X-API-Key")):
    """Chat endpoint using AgentCore with database tools - Requires API Key"""
    # Verify API key
    expected_api_key = os.getenv('API_SECRET_KEY')
    if not x_api_key or x_api_key != expected_api_key:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid or missing API key"
        )

    try:
        # Generate session ID if not provided
        session_id = chat_request.session_id or f"chat_{datetime.now().timestamp()}"

        # Get the last user message
        user_message = chat_request.messages[-1].content if chat_request.messages else ""

        # Build conversation context
        conversation_history = "\n".join([
            f"{msg.role}: {msg.content}" for msg in chat_request.messages[:-1]
        ])

        # Load schema information
        from schema_based_chat import PUBLIC_SCHEMA

        # Enhanced prompt with schema and SQL tool
        enhanced_prompt = f"""You are EcoLafaek AI Assistant, helping users understand waste management data in Timor-Leste.

You have access to TWO tools:

1. **execute_sql_query**: Query the waste management database for statistics, reports, hotspots, waste types
2. **get_ecolafaek_info**: Fetch current information about EcoLafaek platform from the website

{PUBLIC_SCHEMA}

## WHEN TO USE WHICH TOOL:

**Use execute_sql_query for:**
- "How many reports?", "What waste types?", "Which areas have garbage?"
- Statistics, counts, trends, data analysis
- Hotspot information, report details

**Use get_ecolafaek_info for:**
- "What is EcoLafaek?", "How does it work?", "Tell me about EcoLafaek"
- "How to contact?", "Download app", "Who created this?"
- Platform features, mission, technology stack
- Topics: 'about', 'contact', 'download', 'code-repository'

**IMPORTANT: When presenting web scraping results:**
1. Summarize in 3-5 key points (not full text dump)
2. Use bullet points for readability
3. Keep responses under 300 words
4. Focus on what user asked, not everything

## HOW TO ANSWER QUESTIONS:
1. Analyze the user's question
2. Choose the appropriate tool
3. For database questions: Generate SQL SELECT query
4. For platform questions: Fetch from website with appropriate topic
5. Present results in clear, formatted markdown

## EXAMPLES:
User: "How many reports are there?"
SQL: SELECT COUNT(*) as total FROM reports

User: "What are the top waste types?"
SQL: SELECT wt.name, COUNT(*) as count FROM analysis_results ar JOIN waste_types wt ON ar.waste_type_id = wt.waste_type_id GROUP BY wt.name ORDER BY count DESC LIMIT 5

User: "Which areas have most garbage?" or "Where are problem areas?"
SQL: SELECT name, total_reports, average_severity FROM hotspots ORDER BY total_reports DESC LIMIT 10
Note: Use hotspots table for location-based questions - it aggregates reports by area

User: "Show active hotspots"
SQL: SELECT name, total_reports, average_severity, last_reported FROM hotspots WHERE status = 'active' ORDER BY average_severity DESC LIMIT 10

User: "What is EcoLafaek?"
Tool: get_ecolafaek_info(topic='about')
Response format:
"**EcoLafaek** is an AI-powered waste management system for Timor-Leste.

**Key Features:**
• Mobile app for reporting waste with photos
• AI analysis using Amazon Nova-Pro
• Real-time dashboard with maps
• Community engagement through gamification

**Impact Goal:** 5,000+ reports, 100+ hotspots identified in first year.

📱 Download: https://ajitonelson.itch.io/ecolafaek
📧 Contact: ecolafaek@gmail.com"

**WORKFLOW FOR CHART/VISUALIZATION REQUESTS:**

When user asks for "chart", "graph", "visualize", "show distribution", "plot", "make a chart", etc:
YOU MUST ALWAYS call BOTH tools in sequence:
1. First call execute_sql_query to get the data
2. Then IMMEDIATELY call generate_visualization with that data transformed correctly
3. Format response with markdown image and summary

**CRITICAL**: If user asks for "chart for all reports" or similar, default to showing waste type distribution.

Example:
User: "make a chart for all report" or "show chart"
Step 1: execute_sql_query("SELECT waste_type, COUNT(*) as count FROM reports GROUP BY waste_type ORDER BY count DESC")
Step 2: generate_visualization with data transformed: extract labels from 'waste_type' column and values from 'count' column
Step 3: Response with ![Chart](url) + text summary

**WORKFLOW FOR MAP REQUESTS:**

When user asks for "map", "show on map", "hotspots map", etc:
YOU MUST transform SQL results into the correct format:
1. First call execute_sql_query to get locations (with latitude, longitude, name, count fields)
2. Then call create_map_visualization with locations array transformed correctly
3. Each location must have: {{lat: <latitude>, lng: <longitude>, name: <name>, count: <count>}}

Example:
User: "Show hotspots map"
Step 1: execute_sql_query("SELECT name, center_latitude, center_longitude, total_reports FROM hotspots")
Step 2: Transform SQL results - for each row, create: {{lat: center_latitude, lng: center_longitude, name: name, count: total_reports}}
Step 3: create_map_visualization with the transformed locations array
Step 4: Response with ![Map](url) + text summary

**You MUST transform SQL results to the correct tool input format!**

**CRITICAL: YOU MUST CALL generate_visualization OR create_map_visualization TOOL!**

When user asks for charts, trends, or visualizations:
1. Call execute_sql_query to get data
2. YOU MUST call generate_visualization with the data to create the actual chart
3. Use the REAL image_url returned by the tool in your response
4. NEVER use example URLs - only use the actual URL returned by the tool!

When user asks for maps:
1. Call execute_sql_query to get locations
2. YOU MUST call create_map_visualization with locations array
3. Use the REAL map_url returned by the tool
4. NEVER use example URLs - only use the actual URL returned by the tool!

**Response format after tools return:**
- For PNG/JPG images: Embed as ![Description](ACTUAL_URL_FROM_TOOL)
- For HTML maps (.html files): Show as clickable link: [Click here to view the interactive map](ACTUAL_URL_FROM_TOOL)
- Always provide text summary
- The URLs from tools are complete - use them exactly as returned
- Check the file extension: .png/.jpg = embed image, .html = show link

IMPORTANT RULES:
- NEVER query: users, user_verifications, api_keys (private data)
- Only SELECT queries (no INSERT/UPDATE/DELETE)
- Always use LIMIT (max 100)
- Format results with markdown tables/lists
- Be conversational and helpful

Conversation history:
{conversation_history}

User question: {user_message}"""

        logger.info(f"Chat request for session {session_id}: {user_message[:100]}")

        # Try to use Amazon Nova Pro with tool calling
        try:
            # Import web scraping tool
            from web_scraper_tool import fetch_webpage_content, get_ecolafaek_info

            # Import AgentCore tools (optional - will use fallback if not available)
            try:
                from agentcore_tools import (
                    scrape_webpage_with_browser,
                    generate_visualization,
                    create_map_visualization,
                    AGENTCORE_AVAILABLE
                )
            except ImportError:
                AGENTCORE_AVAILABLE = False
                logger.info("AgentCore tools not available - using basic tools only")

            # Prepare tool definitions for SQL execution and web scraping
            tools = [
                {
                    "toolSpec": {
                        "name": "execute_sql_query",
                        "description": "Execute a READ-ONLY SQL SELECT query on the EcoLafaek database. Only SELECT statements are allowed. The database contains public waste management data including reports, waste_types, hotspots, analysis_results, and locations tables. Always use LIMIT to restrict results. Use this for waste data questions.",
                        "inputSchema": {
                            "json": {
                                "type": "object",
                                "properties": {
                                    "sql_query": {
                                        "type": "string",
                                        "description": "The SQL SELECT query to execute. Must be a valid MySQL SELECT statement with LIMIT clause."
                                    }
                                },
                                "required": ["sql_query"]
                            }
                        }
                    }
                },
                {
                    "toolSpec": {
                        "name": "get_ecolafaek_info",
                        "description": "Get current information about the EcoLafaek platform by fetching from the official website. Use this when users ask 'What is EcoLafaek?', 'How does it work?', 'Contact info', 'How to download app', etc. Returns fresh, up-to-date information.",
                        "inputSchema": {
                            "json": {
                                "type": "object",
                                "properties": {
                                    "topic": {
                                        "type": "string",
                                        "description": "What information to fetch: 'about' (general info, mission, how it works), 'contact' (email, support), 'download' (app download links, installation), 'code-repository' (GitHub, source code), or 'general' (default)",
                                        "enum": ["about", "contact", "download", "code-repository", "general", "app"]
                                    }
                                },
                                "required": ["topic"]
                            }
                        }
                    }
                }
            ]

            # Add AgentCore tools if available
            if AGENTCORE_AVAILABLE:
                tools.extend([
                    {
                        "toolSpec": {
                            "name": "generate_visualization",
                            "description": "Generate charts and graphs from data. Use when user asks for 'chart', 'graph', 'visualize', 'show distribution'. Supports bar charts, line graphs, pie charts. Takes data with labels and values.",
                            "inputSchema": {
                                "json": {
                                    "type": "object",
                                    "properties": {
                                        "data": {
                                            "type": "object",
                                            "description": "Data to visualize. Format: {labels: [...], values: [...], title: '...', xlabel: '...', ylabel: '...'}"
                                        },
                                        "chart_type": {
                                            "type": "string",
                                            "description": "Type of chart: 'bar', 'line', 'pie'",
                                            "enum": ["bar", "line", "pie"]
                                        }
                                    },
                                    "required": ["data", "chart_type"]
                                }
                            }
                        }
                    },
                    {
                        "toolSpec": {
                            "name": "create_map_visualization",
                            "description": "Create geographic map of hotspots. Use when user asks for 'map', 'show on map', 'geographic visualization'. Takes locations with lat, lng, name, count.",
                            "inputSchema": {
                                "json": {
                                    "type": "object",
                                    "properties": {
                                        "locations": {
                                            "type": "array",
                                            "description": "Array of location objects with lat, lng, name, count fields",
                                            "items": {
                                                "type": "object",
                                                "properties": {
                                                    "lat": {
                                                        "type": "number",
                                                        "description": "Latitude coordinate"
                                                    },
                                                    "lng": {
                                                        "type": "number",
                                                        "description": "Longitude coordinate"
                                                    },
                                                    "name": {
                                                        "type": "string",
                                                        "description": "Location name or address"
                                                    },
                                                    "count": {
                                                        "type": "number",
                                                        "description": "Number of reports at this location"
                                                    }
                                                },
                                                "required": ["lat", "lng"]
                                            }
                                        }
                                    },
                                    "required": ["locations"]
                                }
                            }
                        }
                    }
                ])
                logger.info("AgentCore visualization tools enabled")

            # Build messages for Nova (filter out system messages, only user/assistant allowed)
            messages = [
                {"role": msg.role, "content": [{"text": msg.content}]}
                for msg in chat_request.messages
                if msg.role in ["user", "assistant"]
            ]

            # Call Bedrock with Nova Pro and tool use
            response = bedrock_runtime.converse(
                modelId="amazon.nova-pro-v1:0",
                messages=messages,
                toolConfig={"tools": tools},
                system=[{"text": enhanced_prompt}]
            )

            # Handle tool use if Nova requests it - support multiple rounds
            output = response['output']
            if 'message' in output:
                message_content = output['message']['content']

                # Loop to allow multiple rounds of tool calling
                max_tool_rounds = 5
                tool_round = 0

                while any(item.get('toolUse') for item in message_content) and tool_round < max_tool_rounds:
                    tool_round += 1
                    logger.info(f"AI requested tool use (round {tool_round})")
                    tool_results = []

                    for item in message_content:
                        if 'toolUse' in item:
                            tool_use = item['toolUse']
                            tool_name = tool_use['name']
                            tool_input = tool_use.get('input', {})
                            logger.info(f"Tool called: {tool_name} with input: {str(tool_input)[:200]}")

                            # Execute the appropriate tool
                            if tool_name == "execute_sql_query":
                                sql_query = tool_input.get('sql_query', '')
                                result = execute_sql_query(sql_query)
                            elif tool_name == "get_ecolafaek_info":
                                topic = tool_input.get('topic', 'general')
                                result = get_ecolafaek_info(topic)
                            elif tool_name == "generate_visualization" and AGENTCORE_AVAILABLE:
                                data = tool_input.get('data', {})
                                chart_type = tool_input.get('chart_type', 'bar')
                                result = generate_visualization(data, chart_type)
                                logger.info(f"Visualization result: {result}")
                            elif tool_name == "create_map_visualization" and AGENTCORE_AVAILABLE:
                                locations = tool_input.get('locations', [])
                                result = create_map_visualization(locations)
                            else:
                                result = {"error": f"Unknown or unavailable tool: {tool_name}"}

                            tool_results.append({
                                "toolResult": {
                                    "toolUseId": tool_use['toolUseId'],
                                    "content": [{"json": result}]
                                }
                            })

                    # Send tool results back to Nova
                    # Filter out empty text blocks from AI message (prevents ValidationException)
                    ai_message = output['message'].copy()
                    ai_message['content'] = [
                        item for item in ai_message['content']
                        if not (item.get('text') is not None and item.get('text').strip() == '')
                    ]
                    messages.append(ai_message)
                    messages.append({"role": "user", "content": tool_results})

                    # Get next response (might be more tool calls or final answer)
                    response = bedrock_runtime.converse(
                        modelId="amazon.nova-pro-v1:0",
                        messages=messages,
                        toolConfig={"tools": tools},
                        system=[{"text": enhanced_prompt}]
                    )

                    output = response['output']
                    message_content = output['message']['content']

                # After all tool rounds, extract final text response
                reply_text = None
                for item in message_content:
                    if 'text' in item and item['text'].strip():
                        reply_text = item['text']
                        break

                if not reply_text:
                    logger.error(f"No text in final response after {tool_round} rounds: {message_content}")
                    reply_text = "I apologize, but I couldn't generate a proper response."
            else:
                reply_text = "I apologize, but I couldn't process your request."

            # Remove <thinking> tags from Nova's response
            import re
            reply_text = re.sub(r'<thinking>.*?</thinking>', '', reply_text, flags=re.DOTALL)
            reply_text = reply_text.strip()

            logger.info(f"Chat response for session {session_id}: {reply_text[:100]}")

            return {
                "reply": reply_text,
                "session_id": session_id,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as bedrock_error:
            logger.error(f"Bedrock Nova error: {bedrock_error}")

            # Fallback: Use keyword-based responses
            reply_text = handle_chat_fallback(user_message)

            return {
                "reply": reply_text,
                "session_id": session_id,
                "timestamp": datetime.now().isoformat(),
                "mode": "fallback"
            }

    except Exception as e:
        import traceback
        logger.error(f"Chat API error: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

def handle_chat_fallback(user_message: str) -> str:
    """Fallback handler when AgentCore is not available"""
    user_message_lower = user_message.lower()

    # Simple keyword-based responses
    if any(word in user_message_lower for word in ['statistic', 'total', 'how many', 'count']):
        stats = get_waste_statistics()
        if 'error' not in stats:
            return f"""**📊 EcoLafaek Statistics**

**Total Reports:** {stats['total_reports']}

**Reports by Status:**
{chr(10).join([f"- {s['status']}: {s['count']}" for s in stats['status_breakdown']])}

**Top Waste Types:**
{chr(10).join([f"- {w['name']}: {w['count']} reports" for w in stats['top_waste_types'][:5]])}"""

    elif any(word in user_message_lower for word in ['hotspot', 'problem area', 'worst']):
        hotspots = get_hotspot_information(5)
        if 'error' not in hotspots and hotspots['count'] > 0:
            return f"""**🔥 Active Waste Hotspots**

Found {hotspots['count']} active hotspots:

{chr(10).join([f"- **{h['name']}**: {h['total_reports']} reports (Severity: {h['average_severity']:.1f})" for h in hotspots['hotspots']])}"""

    elif any(word in user_message_lower for word in ['waste type', 'category', 'categories']):
        waste_types = get_waste_types_info()
        if 'error' not in waste_types:
            return f"""**🗑️ Waste Categories**

{chr(10).join([f"- **{w['name']}** ({w['hazard_level']} hazard): {w['description']}" for w in waste_types['waste_types'][:8]])}"""

    else:
        return """👋 Hello! I'm EcoLafaek AI Assistant.

I can help you with:
- 📊 **Statistics**: Ask about total reports and trends
- 🗺️ **Locations**: Search reports by district
- 🔥 **Hotspots**: Find problem areas
- 🗑️ **Waste Types**: Learn about waste categories

What would you like to know?"""

@app.exception_handler(404)
async def custom_404_handler(request: requests, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content={
            "project": "EcoLafaek",
            "message": "🌱 This path doesn't exist in our EcoLafaek ecosystem",
            "hint": "Contact Admin",
            "status": "not_found"
        }
    )

# Run the app
if __name__ == "__main__":
    # Always use AgentCore when deployed - it handles both local and cloud environments
    agentcore_app.run()