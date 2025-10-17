# AgentCore Tools Integration
# Using official AWS Bedrock AgentCore tools for browser control and code execution

from typing import Optional, Dict, Any
import logging
import json
import base64
from datetime import datetime
import os
import boto3

logger = logging.getLogger(__name__)

# Get S3 configuration from environment
S3_BUCKET = os.getenv('S3_BUCKET_NAME')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')

# Initialize S3 client
try:
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=AWS_REGION
    )
    S3_AVAILABLE = S3_BUCKET is not None
except Exception as e:
    logger.warning(f"S3 client initialization failed: {e}")
    S3_AVAILABLE = False

# Import AgentCore tools
try:
    from bedrock_agentcore.tools.browser_client import browser_session
    from bedrock_agentcore.tools.code_interpreter_client import code_session
    from playwright.sync_api import sync_playwright
    AGENTCORE_AVAILABLE = True
except ImportError:
    logger.warning("AgentCore tools not available. Install with: pip install bedrock-agentcore playwright")
    AGENTCORE_AVAILABLE = False


def scrape_webpage_with_browser(url: str, region: str = "us-west-2") -> Dict[str, Any]:
    """
    Scrape webpage using AgentCore Browser tool with Playwright.
    More powerful than basic requests - can handle JavaScript, screenshots, etc.

    Args:
        url: URL to scrape
        region: AWS region for browser session

    Returns:
        Dictionary with scraped content, screenshot, and metadata
    """
    if not AGENTCORE_AVAILABLE:
        return {
            "success": False,
            "error": "AgentCore browser tool not available. Using fallback."
        }

    try:
        with sync_playwright() as playwright:
            with browser_session(region) as client:
                ws_url, headers = client.generate_ws_headers()
                browser = playwright.chromium.connect_over_cdp(ws_url, headers=headers)

                try:
                    context = browser.contexts[0] if browser.contexts else browser.new_context()
                    page = context.pages[0] if context.pages else context.new_page()

                    # Navigate to URL
                    logger.info(f"Navigating to {url}")
                    page.goto(url, wait_until="domcontentloaded", timeout=10000)

                    # Extract content
                    title = page.title()
                    content = page.content()

                    # Get text content
                    text_content = page.evaluate("""
                        () => {
                            // Remove scripts, styles, nav, footer
                            const elements = document.querySelectorAll('script, style, nav, footer');
                            elements.forEach(el => el.remove());
                            return document.body.innerText;
                        }
                    """)

                    # Extract headings
                    headings = page.evaluate("""
                        () => {
                            const headers = document.querySelectorAll('h1, h2, h3');
                            return Array.from(headers).map(h => h.innerText);
                        }
                    """)

                    # Take screenshot (optional)
                    screenshot_data = page.screenshot(type="jpeg", quality=80, full_page=False)
                    screenshot_b64 = base64.b64encode(screenshot_data).decode('utf-8')

                    logger.info(f"Successfully scraped {url}")

                    return {
                        "success": True,
                        "url": url,
                        "title": title,
                        "headings": headings[:10],
                        "content": text_content[:3000],  # First 3000 chars
                        "screenshot": screenshot_b64[:500],  # Sample of screenshot
                        "has_screenshot": True,
                        "method": "agentcore_browser"
                    }

                finally:
                    browser.close()

    except Exception as e:
        logger.error(f"Browser scraping error: {e}")
        return {
            "success": False,
            "error": f"Browser scraping failed: {str(e)}"
        }


def generate_visualization(data: Dict[str, Any], chart_type: str = "bar", region: str = "us-west-2") -> Dict[str, Any]:
    """
    Generate data visualization using AgentCore Code Interpreter.
    Creates charts/graphs and saves them to static/charts directory.

    Args:
        data: Data to visualize (e.g., {"labels": [...], "values": [...]})
        chart_type: Type of chart (bar, line, pie, scatter, map)
        region: AWS region for code interpreter session

    Returns:
        Dictionary with image_url for accessing the saved chart
    """
    if not AGENTCORE_AVAILABLE:
        return {
            "success": False,
            "error": "AgentCore code interpreter not available."
        }

    try:
        import uuid

        # Generate unique filename
        chart_id = str(uuid.uuid4())[:8]
        filename = f"chart_{chart_id}.png"
        s3_key = f"static/charts/{filename}"

        with code_session(region) as client:
            # Generate Python code for visualization
            if chart_type == "bar":
                code = f"""
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import io
import base64

# Data
data = {repr(data)}
labels = data.get('labels', [])
values = data.get('values', [])

# Create bar chart
fig, ax = plt.subplots(figsize=(10, 6))
ax.bar(labels, values, color='#4CAF50')
ax.set_xlabel(data.get('xlabel', 'Category'))
ax.set_ylabel(data.get('ylabel', 'Count'))
ax.set_title(data.get('title', 'Data Visualization'))
plt.xticks(rotation=45, ha='right')
plt.tight_layout()

# Save to base64
buf = io.BytesIO()
plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
buf.seek(0)
img_b64 = base64.b64encode(buf.read()).decode('utf-8')

print("CHART_DATA:" + img_b64)
plt.close()
"""
            elif chart_type == "line":
                code = f"""
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
import io
import base64

# Data
data = {repr(data)}
labels = data.get('labels', data.get('x', []))
values = data.get('values', data.get('y', []))

# Create line chart
fig, ax = plt.subplots(figsize=(12, 6))
ax.plot(range(len(values)), values, marker='o', linewidth=2, color='#2196F3', markersize=6)
ax.set_xticks(range(len(labels)))
ax.set_xticklabels(labels, rotation=45, ha='right')
ax.set_xlabel(data.get('xlabel', 'Date'))
ax.set_ylabel(data.get('ylabel', 'Count'))
ax.set_title(data.get('title', 'Line Chart'))
ax.grid(True, alpha=0.3)
plt.tight_layout()

buf = io.BytesIO()
plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
buf.seek(0)
img_b64 = base64.b64encode(buf.read()).decode('utf-8')

print("CHART_DATA:" + img_b64)
plt.close()
"""
            elif chart_type == "pie":
                code = f"""
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
import io
import base64

data = {repr(data)}
labels = data.get('labels', [])
values = data.get('values', [])

fig, ax = plt.subplots(figsize=(10, 6))
ax.pie(values, labels=labels, autopct='%1.1f%%', startangle=90, colors=['#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0'])
ax.set_title(data.get('title', 'Pie Chart'))
plt.tight_layout()

buf = io.BytesIO()
plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
buf.seek(0)
img_b64 = base64.b64encode(buf.read()).decode('utf-8')

print("CHART_DATA:" + img_b64)
plt.close()
"""
            else:
                return {"success": False, "error": f"Unsupported chart type: {chart_type}"}

            # Execute code
            logger.info(f"Executing chart generation code for {chart_type} chart")
            result = client.invoke("executeCode", {"language": "python", "code": code})
            logger.info(f"AgentCore result keys: {result.keys()}")

            # Extract chart data from output
            chart_data = None
            all_output = []
            for event in result.get("stream", []):
                content = event.get("result", {}).get("content", "")
                # Content might be a string or list
                if isinstance(content, str):
                    all_output.append(content)
                    if "CHART_DATA:" in content:
                        chart_data = content.split("CHART_DATA:")[1].strip()
                        break
                elif isinstance(content, list):
                    # Handle list of content items
                    for item in content:
                        if isinstance(item, dict) and 'text' in item:
                            text = item['text']
                            all_output.append(text)
                            if "CHART_DATA:" in text:
                                chart_data = text.split("CHART_DATA:")[1].strip()
                                break

            if not chart_data:
                logger.error(f"No CHART_DATA in AgentCore output. All output: {str(all_output[:3])}")

            if chart_data:
                # Decode base64 image
                image_bytes = base64.b64decode(chart_data)

                # Upload to S3
                if S3_AVAILABLE:
                    try:
                        s3_client.put_object(
                            Bucket=S3_BUCKET,
                            Key=s3_key,
                            Body=image_bytes,
                            ContentType='image/png'
                            # Note: Removed ACL='public-read' - bucket policy should handle public access
                        )
                        # Generate S3 URL
                        image_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
                        logger.info(f"Chart uploaded to S3: {image_url}")
                    except Exception as s3_error:
                        logger.error(f"S3 upload failed: {s3_error}")
                        return {"success": False, "error": f"S3 upload failed: {str(s3_error)}"}
                else:
                    return {"success": False, "error": "S3 not configured"}

                return {
                    "success": True,
                    "chart_type": chart_type,
                    "image_url": image_url,
                    "format": "png",
                    "method": "agentcore_code_interpreter"
                }
            else:
                return {
                    "success": False,
                    "error": "Chart generation failed - no output"
                }

    except Exception as e:
        logger.error(f"Visualization generation error: {e}")
        return {
            "success": False,
            "error": f"Visualization failed: {str(e)}"
        }


def create_map_visualization(locations: list, region: str = "us-west-2") -> Dict[str, Any]:
    """
    Create a map visualization of waste hotspots using folium.
    Saves map as HTML file to S3.

    Args:
        locations: List of dicts with lat, lng, name, count
        region: AWS region

    Returns:
        Dictionary with map_url for accessing the saved map
    """
    try:
        import folium
        import uuid

        # Generate unique filename
        map_id = str(uuid.uuid4())[:8]
        filename = f"map_{map_id}.html"
        s3_key = f"static/charts/{filename}"

        # Calculate center of map (average of all coordinates)
        if locations:
            center_lat = sum(loc['lat'] for loc in locations) / len(locations)
            center_lng = sum(loc['lng'] for loc in locations) / len(locations)
        else:
            center_lat, center_lng = -8.556, 125.560  # Dili, Timor-Leste default

        # Create map centered on the locations
        m = folium.Map(
            location=[center_lat, center_lng],
            zoom_start=13,
            tiles='OpenStreetMap'
        )

        # Add markers for each hotspot
        for loc in locations:
            lat = loc['lat']
            lng = loc['lng']
            name = loc.get('name', 'Unknown')
            count = loc.get('count', 1)

            # Color based on count (red for high, yellow for low)
            if count >= 10:
                color = 'red'
            elif count >= 5:
                color = 'orange'
            else:
                color = 'yellow'

            # Create marker with popup
            folium.CircleMarker(
                location=[lat, lng],
                radius=5 + count * 2,  # Size based on count
                popup=f'<b>{name}</b><br>Reports: {count}',
                tooltip=f'{count} reports',
                color='black',
                fillColor=color,
                fillOpacity=0.7,
                weight=1
            ).add_to(m)

        # Save map to HTML string
        html_string = m._repr_html_()

        # Upload to S3
        if S3_AVAILABLE:
            try:
                s3_client.put_object(
                    Bucket=S3_BUCKET,
                    Key=s3_key,
                    Body=html_string.encode('utf-8'),
                    ContentType='text/html'
                )
                # Generate S3 URL
                map_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
                logger.info(f"Folium map uploaded to S3: {map_url}")

                return {
                    "success": True,
                    "type": "map",
                    "map_url": map_url,
                    "format": "html",
                    "method": "folium_direct"
                }
            except Exception as s3_error:
                logger.error(f"S3 upload failed: {s3_error}")
                return {"success": False, "error": f"S3 upload failed: {str(s3_error)}"}
        else:
            return {"success": False, "error": "S3 not configured"}

    except ImportError:
        logger.warning("Folium not available, falling back to matplotlib")
        # Fallback to matplotlib if folium not installed
        return create_map_with_matplotlib(locations, region)
    except Exception as e:
        logger.error(f"Map generation error: {e}")
        return {"success": False, "error": str(e)}


def create_map_with_matplotlib(locations: list, region: str = "us-west-2") -> Dict[str, Any]:
    """
    Fallback: Create a map visualization using matplotlib and AgentCore.
    """
    if not AGENTCORE_AVAILABLE:
        return {"success": False, "error": "AgentCore not available"}

    try:
        import uuid

        # Generate unique filename
        map_id = str(uuid.uuid4())[:8]
        filename = f"map_{map_id}.png"
        s3_key = f"static/charts/{filename}"

        with code_session(region) as client:
            # Use matplotlib to create geographic scatter plot
            # Build code using string formatting to avoid f-string issues
            code = """
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
import io
import base64

# Locations data
locations = %s

# Extract coordinates and counts
lats = [loc['lat'] for loc in locations]
lngs = [loc['lng'] for loc in locations]
counts = [loc.get('count', 1) for loc in locations]
names = [loc.get('name', 'Unknown') for loc in locations]

# Create figure
fig, ax = plt.subplots(figsize=(12, 8))

# Plot hotspots with color based on count
scatter = ax.scatter(lngs, lats, s=[c*50 for c in counts], c=counts,
                     cmap='YlOrRd', alpha=0.6, edgecolors='black', linewidth=1)

# Add labels for each point
for i, (lng, lat, name, count) in enumerate(zip(lngs, lats, names, counts)):
    ax.annotate(str(count), (lng, lat), fontsize=8, ha='center', va='center', fontweight='bold')

# Customize plot
ax.set_xlabel('Longitude', fontsize=12)
ax.set_ylabel('Latitude', fontsize=12)
ax.set_title('Waste Hotspots Map - Dili, Timor-Leste', fontsize=14, fontweight='bold')
ax.grid(True, alpha=0.3)

# Add colorbar
cbar = plt.colorbar(scatter, ax=ax)
cbar.set_label('Number of Reports', rotation=270, labelpad=20)

plt.tight_layout()

# Save to base64
buf = io.BytesIO()
plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
buf.seek(0)
img_b64 = base64.b64encode(buf.read()).decode('utf-8')

print("MAP_DATA:" + img_b64)
plt.close()
""" % repr(locations)

            logger.info(f"Executing map generation code for {len(locations)} locations")
            logger.debug(f"Map code to execute: {code[:500]}")
            result = client.invoke("executeCode", {"language": "python", "code": code})
            logger.info(f"AgentCore result keys: {result.keys()}")

            # Extract map data from output (same as chart extraction)
            map_data = None
            all_output = []
            for event in result.get("stream", []):
                content = event.get("result", {}).get("content", "")
                # Content might be a string or list
                if isinstance(content, str):
                    all_output.append(content)
                    if "MAP_DATA:" in content:
                        map_data = content.split("MAP_DATA:")[1].strip()
                        break
                elif isinstance(content, list):
                    # Handle list of content items
                    for item in content:
                        if isinstance(item, dict) and 'text' in item:
                            text = item['text']
                            all_output.append(text)
                            if "MAP_DATA:" in text:
                                map_data = text.split("MAP_DATA:")[1].strip()
                                break

            if not map_data:
                logger.error(f"No MAP_DATA in AgentCore output. All output: {str(all_output[:3])}")

            if map_data:
                # Decode base64 HTML
                html_bytes = base64.b64decode(map_data)

                # Upload to S3
                if S3_AVAILABLE:
                    try:
                        s3_client.put_object(
                            Bucket=S3_BUCKET,
                            Key=s3_key,
                            Body=html_bytes,
                            ContentType='text/html'
                            # Note: Removed ACL='public-read' - bucket policy should handle public access
                        )
                        # Generate S3 URL
                        map_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
                        logger.info(f"Folium map uploaded to S3: {map_url}")
                    except Exception as s3_error:
                        logger.error(f"S3 upload failed: {s3_error}")
                        return {"success": False, "error": f"S3 upload failed: {str(s3_error)}"}
                else:
                    return {"success": False, "error": "S3 not configured"}

                return {
                    "success": True,
                    "type": "map",
                    "map_url": map_url,
                    "format": "html",
                    "method": "agentcore_folium"
                }

            return {"success": False, "error": "Map generation failed"}

    except Exception as e:
        logger.error(f"Map generation error: {e}")
        return {"success": False, "error": str(e)}
