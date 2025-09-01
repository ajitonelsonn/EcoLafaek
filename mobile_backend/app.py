import os
import json
import time
import logging
import base64
import requests
import re
from io import BytesIO
from typing import List, Dict, Optional, Any, Union
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, UploadFile, File, Form, Body, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, EmailStr
import boto3
import mysql.connector
from mysql.connector import Error
import jwt
import hashlib
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)
print("DB Name:", os.getenv('DB_NAME'))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="EcoLafaek API",
    description="Environmental waste monitoring API for Timor-Leste powered by Tidb with Amazon Nova Pro",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Amazon Bedrock configuration
BEDROCK_MODEL_ID = os.getenv('BEDROCK_MODEL_ID', 'amazon.nova-pro-v1:0')
BEDROCK_BEARER_TOKEN = os.getenv('AWS_BEARER_TOKEN_BEDROCK')
BEDROCK_ENDPOINT = os.getenv('BEDROCK_ENDPOINT', 'https://bedrock-runtime.us-east-1.amazonaws.com')

if not BEDROCK_BEARER_TOKEN:
    logger.critical("AWS_BEARER_TOKEN_BEDROCK environment variable not set")
    raise ValueError("AWS_BEARER_TOKEN_BEDROCK missing")

# Initialize Bedrock client with bearer token
try:
    # For bearer token authentication, we'll use requests directly instead of boto3
    bedrock_runtime = None  # We'll use direct HTTP calls
    logger.info(f"Using Bedrock model: {BEDROCK_MODEL_ID} with bearer token authentication")
except Exception as e:
    logger.critical(f"Bedrock configuration failed: {e}")
    raise ValueError("Failed to configure Bedrock client")

# AWS S3 configuration
try:
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION')
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

# Get database connection
def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
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

def invoke_bedrock_model(prompt: str, image_data: str = None):
    """
    Invoke Amazon Bedrock model using bearer token authentication
    
    Args:
        prompt: Text prompt for the model
        image_data: Base64 encoded image data (optional)
    
    Returns:
        Model response or None if failed
    """
    try:
        # Prepare headers with bearer token
        headers = {
            'Authorization': f'Bearer {BEDROCK_BEARER_TOKEN}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        # Prepare the request body for Amazon Nova Pro
        if image_data:
            # Nova Pro multimodal request format
            body = {
                "inferenceConfig": {
                    "max_new_tokens": 2000,
                    "temperature": 0.1,
                    "top_p": 0.9
                },
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "text": prompt
                            },
                            {
                                "image": {
                                    "format": "jpeg",
                                    "source": {
                                        "bytes": image_data
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        else:
            # Text-only request
            body = {
                "inferenceConfig": {
                    "max_new_tokens": 2000,
                    "temperature": 0.1,
                    "top_p": 0.9
                },
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ]
            }
        
        # Make the API request
        url = f"{BEDROCK_ENDPOINT}/model/{BEDROCK_MODEL_ID}/converse"
        
        response = requests.post(
            url,
            headers=headers,
            json=body,
            timeout=60
        )
        
        if response.status_code != 200:
            logger.error(f"Bedrock API error: {response.status_code} - {response.text}")
            return None
        
        response_data = response.json()
        
        # Extract text from Nova Pro response format
        if 'output' in response_data and 'message' in response_data['output']:
            message = response_data['output']['message']
            if 'content' in message and len(message['content']) > 0:
                return message['content'][0].get('text', '')
        
        logger.error(f"Unexpected response format from Bedrock: {response_data}")
        return None
        
    except Exception as e:
        logger.error(f"Bedrock model invocation error: {e}")
        return None
# Core functionality for image analysis with Amazon Nova Pro
async def analyze_image_with_bedrock(image_url):
    """
    Analyze a waste image using Amazon Nova Pro
    
    Args:
        image_url: URL to the image
        
    Returns:
        Dictionary with analysis results
    """
    max_attempts = 3  # Maximum number of retry attempts
    current_attempt = 0
    
    while current_attempt < max_attempts:
        try:
            current_attempt += 1
            logger.info(f"Attempt {current_attempt} - Analyzing image from: {image_url}")
            
            # Download the image
            response = requests.get(image_url)
            if response.status_code != 200:
                logger.error(f"Failed to download image from {image_url}: {response.status_code}")
                return None
                
            # Log image details
            content_type = response.headers.get('Content-Type', 'Unknown')
            image_size = len(response.content)
            logger.info(f"Successfully downloaded image: Type={content_type}, Size={image_size} bytes")
            
            # Convert image to base64
            image_data = base64.b64encode(response.content).decode('utf-8')
            logger.info(f"Converted image to base64 format (length: {len(image_data)} chars)")
            
            # First prompt: Determine if the image contains waste/garbage
            initial_prompt = """
            Carefully examine this image and determine if it shows improper waste disposal, garbage, trash, or discarded materials in the environment.
            
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
            {
              "contains_waste": true/false, 
              "confidence": 0-100, 
              "reasoning": "brief explanation", 
              "short_description": "concise description (max 8 words)", 
              "full_description": "detailed description of what you see in the image (2-3 sentences)"
            }
            """
            
            logger.info(f"Sending multimodal request with image to Nova Pro")
            
            # Make Nova Pro API request 
            initial_response = invoke_bedrock_model(initial_prompt, image_data)
            
            if not initial_response:
                logger.error(f"Nova Pro API failed for initial analysis")
                if current_attempt < max_attempts:
                    logger.info(f"Retrying... ({current_attempt}/{max_attempts})")
                    time.sleep(2)  # Add a short delay before retrying
                    continue
                return None
                
            logger.info(f"Received response from Nova Pro API")
            
            try:
                # Extract JSON from the response
                json_match = re.search(r'({[\s\S]*})', initial_response)
                if json_match:
                    waste_check = json.loads(json_match.group(1))
                else:
                    waste_check = json.loads(initial_response)
                
                # If we successfully parsed the JSON, break out of the retry loop
                break
                
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse JSON from initial waste check (Attempt {current_attempt}/{max_attempts})")
                if current_attempt < max_attempts:
                    logger.info(f"Retrying JSON parsing... ({current_attempt}/{max_attempts})")
                    time.sleep(2)  # Add a short delay before retrying
                    continue
                
                # If we've reached max attempts, use default values
                logger.warning("Max retry attempts reached. Defaulting to no waste detection")
                waste_check = {
                    "contains_waste": False, 
                    "confidence": 75, 
                    "reasoning": "Failed to parse response after multiple attempts, defaulting to no waste detection",
                    "short_description": "Unable to determine content",
                    "full_description": "Unable to generate a detailed description due to parsing issues after multiple attempts."
                }
                break
        
        except Exception as e:
            logger.error(f"Error in analyze_image_with_bedrock (Attempt {current_attempt}/{max_attempts}): {e}")
            if current_attempt < max_attempts:
                logger.info(f"Retrying due to exception... ({current_attempt}/{max_attempts})")
                time.sleep(2)  # Add a short delay before retrying
                continue
            return None
    
    # Get short description
    short_description = waste_check.get("short_description", "")
    if len(short_description.split()) > 8:
        # Truncate to 8 words if needed
        short_description = " ".join(short_description.split()[:8])
    
    # Get full description
    full_description = waste_check.get("full_description", "")
    if not full_description:
        full_description = f"{waste_check.get('reasoning', 'No details available.')} {short_description}"
    
    # If the image doesn't contain waste, return minimal analysis
    if not waste_check.get("contains_waste", False):
        logger.info(f"Image determined not to contain waste: {waste_check.get('reasoning', 'No reason provided')}")
        return {
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
        }
    
    # If image contains waste, proceed with detailed analysis
    # Add retry mechanism for the detailed analysis as well
    detailed_analysis_attempts = 0
    max_detailed_attempts = 3
    
    while detailed_analysis_attempts < max_detailed_attempts:
        try:
            detailed_analysis_attempts += 1
            logger.info(f"Detailed analysis attempt {detailed_analysis_attempts} for image containing waste")
            
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
            
            logger.info(f"Sending multimodal request for detailed analysis to Nova Pro")
            
            # Make Nova Pro API request for detailed analysis
            detailed_response = invoke_bedrock_model(detailed_prompt, image_data)
            
            if not detailed_response:
                logger.error(f"Nova Pro API failed for detailed analysis")
                if detailed_analysis_attempts < max_detailed_attempts:
                    logger.info(f"Retrying detailed analysis... ({detailed_analysis_attempts}/{max_detailed_attempts})")
                    time.sleep(2)  # Add a short delay before retrying
                    continue
                return None
                
            logger.info(f"Received detailed response from Nova Pro API")
            
            # Parse the JSON result from the response text
            try:
                # Find JSON content in the response (might be surrounded by text)
                json_match = re.search(r'({[\s\S]*})', detailed_response)
                if json_match:
                    json_str = json_match.group(1)
                    analysis_result = json.loads(json_str)
                else:
                    # If no JSON found, try to parse the entire response
                    analysis_result = json.loads(detailed_response)
                    
                # If successful, break out of the retry loop
                break
                
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse JSON from Nova Pro detailed response (Attempt {detailed_analysis_attempts}/{max_detailed_attempts})")
                if detailed_analysis_attempts < max_detailed_attempts:
                    logger.info(f"Retrying detailed JSON parsing... ({detailed_analysis_attempts}/{max_detailed_attempts})")
                    time.sleep(2)  # Add a short delay before retrying
                    continue
                    
                # If we've reached max attempts, create a structured result from the text
                logger.warning("Max retry attempts reached. Creating structured result from text")
                analysis_result = {
                    "waste_type": "Mixed",  # Default to Mixed if unable to determine
                    "severity_score": 5,    # Default to medium severity
                    "priority_level": "medium",
                    "environmental_impact": "Unable to determine from image after multiple attempts",
                    "estimated_volume": "Unknown",
                    "safety_concerns": "Unable to determine from image after multiple attempts",
                    "analysis_notes": detailed_response[:500] + "... (truncated)",  # Use part of the response as notes
                    "full_description": full_description  # Use the initial full description as fallback
                }
                break
                
        except Exception as e:
            logger.error(f"Error in detailed analysis (Attempt {detailed_analysis_attempts}/{max_detailed_attempts}): {e}")
            if detailed_analysis_attempts < max_detailed_attempts:
                logger.info(f"Retrying detailed analysis due to exception... ({detailed_analysis_attempts}/{max_detailed_attempts})")
                time.sleep(2)  # Add a short delay before retrying
                continue
                
            # If we've reached max attempts due to exceptions, return a default analysis
            logger.warning("Max retry attempts reached due to exceptions. Using default analysis")
            analysis_result = {
                "waste_type": "Unknown",
                "severity_score": 5,
                "priority_level": "medium",
                "environmental_impact": "Unknown - analysis failed",
                "estimated_volume": "Unknown",
                "safety_concerns": "Unknown - analysis failed",
                "analysis_notes": f"Analysis failed after {max_detailed_attempts} attempts. Error: {str(e)}",
                "full_description": full_description
            }
            break
    
    # Add the waste detection confidence and short description
    analysis_result["waste_detection_confidence"] = waste_check.get("confidence", 100)
    analysis_result["short_description"] = short_description or f"{analysis_result['waste_type']} waste, {analysis_result['priority_level']} priority"
    
    # Ensure full_description exists in the result
    if "full_description" not in analysis_result or not analysis_result["full_description"]:
        analysis_result["full_description"] = full_description
    
    logger.info(f"Nova Pro analysis complete: {analysis_result}")
    return analysis_result
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
        
        # Analyze image with Nova Pro
        analysis_result = await analyze_image_with_bedrock(report['image_url'])
        
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
            
            # Insert analysis results for non-garbage
            cursor.execute(
                """
                INSERT INTO analysis_results (
                    report_id, analyzed_date, waste_type_id, confidence_score,
                    estimated_volume, severity_score, priority_level,
                    analysis_notes, full_description, processed_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                    'Nova AI'
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
            
            cursor.close()
            connection.close()
            
            return {
                "success": True,
                "message": f"Report {report_id} analyzed successfully: Not Garbage",
                "analysis": analysis_result
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
        
        # Insert analysis results
        cursor.execute(
            """
            INSERT INTO analysis_results (
                report_id, analyzed_date, waste_type_id, confidence_score,
                estimated_volume, severity_score, priority_level,
                analysis_notes, full_description, processed_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                'Nova AI'
            )
        )
        connection.commit()
        
        # Continue to Part 3 for hotspot logic...
        
    except Exception as e:
        logger.error(f"Error processing report {report_id}: {e}")
        return {"success": False, "message": f"Error processing report: {str(e)}"}
    # Check for hotspots (reports nearby) - continuing from process_report function
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
                        analysis_result['severity_score'],
                        'active'
                    )
                )
                
                hotspot_id = cursor.lastrowid
            
            # First, check if the current report is already associated with the hotspot
            cursor.execute(
                """
                SELECT * FROM hotspot_reports 
                WHERE hotspot_id = %s AND report_id = %s
                """, 
                (hotspot_id, report_id)
            )
            
            if not cursor.fetchone():
                # Associate current report with hotspot if not already linked
                cursor.execute(
                    """
                    INSERT INTO hotspot_reports (hotspot_id, report_id)
                    VALUES (%s, %s)
                    """,
                    (hotspot_id, report_id)
                )
            
            # Associate all nearby reports with the hotspot if not already linked
            for nearby_report in nearby_reports:
                nearby_id = nearby_report['report_id']
                
                # Check if this nearby report is already associated with the hotspot
                cursor.execute(
                    """
                    SELECT * FROM hotspot_reports 
                    WHERE hotspot_id = %s AND report_id = %s
                    """, 
                    (hotspot_id, nearby_id)
                )
                
                if not cursor.fetchone():
                    # Associate nearby report with hotspot if not already linked
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
async def register(user_data: UserCreate):
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
async def login(login_data: UserLogin):
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
async def submit_report(report_data: ReportCreate, background_tasks: BackgroundTasks, user_id: int = Depends(get_user_from_token)):
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
                "total_pages": (total_reports + per_page - 1) // per_page
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
        
        cursor.close()
        connection.close()
        
        return {
            "status": "success",
            "user_stats": user_stats,
            "waste_distribution": waste_distribution,
            "severity_distribution": severity_distribution,
            "priority_distribution": priority_distribution,
            "monthly_reports": monthly_reports,
            "recent_reports": recent_reports
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

@app.get("/api/test/nova", response_model=dict)
async def test_nova_api(image_url: str, user_id: int = Depends(get_user_from_token)):
    try:
        # Simple test endpoint to check if the Nova API integration is working
        analysis_result = await analyze_image_with_bedrock(image_url)
        
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


# Run the app
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)