# Web Scraping Tool for EcoLafaek AI
# Fetches real-time information from EcoLafaek website

import requests
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

# Allowed URLs for security
ALLOWED_URLS = [
    "https://www.ecolafaek.com/about",
    "https://www.ecolafaek.com/contact",
    "https://www.ecolafaek.com/download",
    "https://www.ecolafaek.com/code-repository"
]

def fetch_webpage_content(url: str) -> dict:
    """
    Fetch and extract text content from EcoLafaek website pages.
    Only works with whitelisted EcoLafaek URLs for security.

    Args:
        url: The URL to fetch content from (must be in ALLOWED_URLS)

    Returns:
        Dictionary with success status and extracted content
    """
    try:
        # Security check
        if url not in ALLOWED_URLS:
            return {
                "success": False,
                "error": f"URL not allowed. Only these URLs are permitted: {', '.join(ALLOWED_URLS)}"
            }

        # Fetch the page
        headers = {
            'User-Agent': 'EcoLafaek-AI-Assistant/1.0'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        # Parse HTML
        soup = BeautifulSoup(response.text, 'html.parser')

        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer"]):
            script.decompose()

        # Get text content
        text = soup.get_text(separator='\n', strip=True)

        # Clean up whitespace
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        clean_text = '\n'.join(lines)

        # Extract title
        title = soup.title.string if soup.title else "No title"

        # Extract main headings
        headings = [h.get_text(strip=True) for h in soup.find_all(['h1', 'h2', 'h3'])]

        # Extract key sections intelligently
        sections = {}
        current_section = "intro"
        section_text = []

        for line in lines:
            # Detect section headers
            if any(keyword in line.lower() for keyword in ['mission', 'how it works', 'features', 'technology', 'contact', 'download']):
                if section_text:
                    sections[current_section] = ' '.join(section_text)
                current_section = line.lower().replace(':', '').strip()
                section_text = []
            else:
                section_text.append(line)

        if section_text:
            sections[current_section] = ' '.join(section_text)

        # Create a concise summary (max 2000 chars)
        summary_parts = []
        for key, value in list(sections.items())[:5]:  # First 5 sections
            summary_parts.append(f"{key.title()}: {value[:300]}...")

        summary = '\n\n'.join(summary_parts)

        logger.info(f"Successfully fetched content from {url}")

        return {
            "success": True,
            "url": url,
            "title": title,
            "headings": headings[:10],  # Top 10 headings
            "summary": summary[:2000],  # Concise summary
            "sections": sections,
            "note": "This is a summary. Full details at " + url
        }

    except requests.Timeout:
        logger.error(f"Timeout fetching {url}")
        return {
            "success": False,
            "error": "Request timed out. The website may be slow or unavailable."
        }
    except requests.RequestException as e:
        logger.error(f"Error fetching {url}: {e}")
        return {
            "success": False,
            "error": f"Failed to fetch webpage: {str(e)}"
        }
    except Exception as e:
        logger.error(f"Unexpected error fetching {url}: {e}")
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}"
        }


def get_ecolafaek_info(topic: str = "general") -> dict:
    """
    Get information about EcoLafaek by fetching from website.
    This function dynamically fetches current information.

    Args:
        topic: What information to fetch - "about", "contact", "download", "code-repository", or "general"

    Returns:
        Dictionary with fetched information
    """
    # Map topics to URLs
    topic_urls = {
        "about": "https://www.ecolafaek.com/about",
        "contact": "https://www.ecolafaek.com/contact",
        "download": "https://www.ecolafaek.com/download",
        "code-repository": "https://www.ecolafaek.com/code-repository",
        "code": "https://www.ecolafaek.com/code-repository",
        "app": "https://www.ecolafaek.com/download",
        "general": "https://www.ecolafaek.com/about"
    }

    url = topic_urls.get(topic.lower(), "https://www.ecolafaek.com/about")

    result = fetch_webpage_content(url)

    if result["success"]:
        # Use summary instead of content (from new implementation)
        info_text = result.get("summary", result.get("content", ""))

        return {
            "success": True,
            "topic": topic,
            "source_url": url,
            "information": info_text,
            "title": result.get("title", ""),
            "headings": result.get("headings", []),
            "note": result.get("note", "")
        }
    else:
        return result


# Static fallback information (used if website is down)
FALLBACK_INFO = {
    "platform": "EcoLafaek",
    "description": "AI-powered waste management system for Timor-Leste",
    "email": "ecolafaek@gmail.com",
    "website": "https://www.ecolafaek.com",
    "download": "https://ajitonelson.itch.io/ecolafaek",
    "note": "For latest information, visit www.ecolafaek.com"
}
