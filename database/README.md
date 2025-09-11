# EcoLafaek Database Schema

## Overview

This TiDB database powers the EcoLafaek environmental waste monitoring system for Timor-Leste. It manages community waste reports, AI-powered analysis with vector embeddings, user authentication, and real-time dashboard visualization.

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ REPORTS : submits
    USERS ||--o{ USER_VERIFICATIONS : has
    LOCATIONS ||--o{ REPORTS : contains
    REPORTS ||--o{ ANALYSIS_RESULTS : analyzed_by
    ANALYSIS_RESULTS ||--o{ REPORT_WASTE_TYPES : has
    WASTE_TYPES ||--o{ ANALYSIS_RESULTS : classified_as
    WASTE_TYPES ||--o{ REPORT_WASTE_TYPES : categorized_as
    REPORTS }o--o{ HOTSPOTS : included_in
    HOTSPOTS }o--o{ HOTSPOT_REPORTS : contains
    REPORTS }o--o{ HOTSPOT_REPORTS : belongs_to
    REPORTS ||--o{ IMAGE_PROCESSING_QUEUE : queued_for
    USERS ||--o{ API_KEYS : created_by
    ADMIN_USERS ||--o{ SYSTEM_LOGS : created_by

    USERS {
        int user_id PK
        string username UK
        string email UK
        string phone_number
        string password_hash
        datetime registration_date
        datetime last_login
        enum account_status
        string profile_image_url
        boolean verification_status
    }

    REPORTS {
        int report_id PK
        int user_id FK
        decimal latitude
        decimal longitude
        int location_id FK
        datetime report_date
        text description
        enum status
        string image_url
        json device_info
        string address_text
    }

    ANALYSIS_RESULTS {
        int analysis_id PK
        int report_id FK
        datetime analyzed_date
        int waste_type_id FK
        decimal confidence_score
        decimal estimated_volume
        int severity_score
        enum priority_level
        text analysis_notes
        text full_description
        string processed_by
        vector image_embedding
        vector location_embedding
    }

    WASTE_TYPES {
        int waste_type_id PK
        string name
        text description
        enum hazard_level
        boolean recyclable
        string icon_url
    }

    HOTSPOTS {
        int hotspot_id PK
        string name
        decimal center_latitude
        decimal center_longitude
        int radius_meters
        int location_id FK
        date first_reported
        date last_reported
        int total_reports
        decimal average_severity
        enum status
        text notes
    }

    LOCATIONS {
        int location_id PK
        string name
        string district
        string sub_district
        decimal latitude
        decimal longitude
        int population_estimate
        decimal area_sqkm
    }

    REPORT_WASTE_TYPES {
        int id PK
        int analysis_id FK
        int waste_type_id FK
        decimal confidence_score
        decimal percentage
    }

    USER_VERIFICATIONS {
        int verification_id PK
        int user_id FK
        string email
        string otp
        datetime created_at
        datetime expires_at
        boolean is_verified
        int attempts
    }

    PENDING_REGISTRATIONS {
        int registration_id PK
        string username UK
        string email UK
        string phone_number
        string password_hash
        string otp
        datetime created_at
        datetime expires_at
        int attempts
    }

    API_KEYS {
        int key_id PK
        string api_key
        string name
        datetime created_date
        datetime expiration_date
        boolean active
        json permissions
        datetime last_used
        int created_by FK
    }

    IMAGE_PROCESSING_QUEUE {
        int queue_id PK
        int report_id FK
        string image_url
        enum status
        datetime queued_at
        datetime processed_at
        int retry_count
        text error_message
    }

    ADMIN_USERS {
        int admin_id PK
        string username UK
        string email UK
        string password_hash
        enum role
        datetime created_at
        datetime last_login
        boolean active
    }

    SYSTEM_SETTINGS {
        int setting_id PK
        string setting_key UK
        text setting_value
        enum data_type
        text description
        datetime created_at
        datetime updated_at
    }

    NOTIFICATION_TEMPLATES {
        int template_id PK
        string name
        string subject
        text body
        enum type
        datetime created_at
        datetime updated_at
    }
```

## Key Tables

### Core Data Tables

#### `users`

Stores registered user accounts who can submit waste reports through the mobile app.

- Authentication details secured with PBKDF2-SHA256 hashing
- Email verification system with OTP
- Status tracking for account management

#### `reports`

Citizen-submitted waste incidents with geolocation and images.

- Precise latitude/longitude for mapping
- Lifecycle tracking (submitted → analyzing → analyzed → resolved)
- S3 image URLs for waste photographs
- Device metadata for quality control

#### `analysis_results`

Amazon Bedrock Titan AI analysis of waste reports with structured insights and vector embeddings.

- Waste classification with confidence scores
- Severity assessment (1-10 scale)
- Priority categorization (low/medium/high/critical)
- Environmental impact analysis
- Volume estimation
- Detailed waste description in natural language
- **Vector Embeddings**: 1024-dimensional vectors for image and location similarity search using TiDB's vector capabilities
  - `image_embedding`: Generated from waste photos using Titan Embed Image v1 model
  - `location_embedding`: Spatial embeddings for geographic similarity analysis

#### `waste_types`

Classification taxonomy for different waste categories.

- Hazard level assessment
- Recyclability flags
- Material categories (Plastic, Metal, Organic, etc.)

#### `hotspots`

Identified areas with recurring waste problems.

- Automatically detected when 3+ reports occur within 500m
- Centroids calculated from report clusters
- Severity aggregation for prioritization
- Tracking of waste concentration over time

### Support Tables

#### `report_waste_types`

Many-to-many relationship for reports containing multiple waste types.

- Confidence scores for each waste type identified
- Percentage breakdown of mixed waste composition
- Links analysis results to multiple waste categories

#### `user_verifications` & `pending_registrations`

Two-step user registration and verification system.

- OTP-based email verification
- Temporary storage for unverified registrations
- Attempt limiting for security
- Automatic cleanup of expired verifications

#### `locations`

Predefined geographic regions and administrative divisions in Timor-Leste.

- District and sub-district hierarchies
- Population and area statistics
- Geospatial reference points for reports

#### `api_keys`

API access management for external integrations.

- Scoped permissions with JSON-based access control
- Expiration date management
- Usage tracking and analytics
- Created by user tracking for audit trails

#### `image_processing_queue`

Asynchronous queue for Amazon Bedrock Titan processing.

- Status tracking for image analysis
- Error handling with retry logic
- Performance monitoring
- Batch processing capabilities

#### `dashboard_statistics`

Pre-calculated metrics for efficient dashboard visualization.

- Aggregated metrics by location, date, and waste type
- Trend analysis indicators
- Optimized for frontend performance

#### `system_logs`

System activities audit trail for monitoring and debugging.

- API call tracking
- Error logging
- User action history

### Administrative Tables

#### `admin_users`

Administrative user accounts for the EcoLafaek admin panel with role-based access control.

- Role-based permissions (super_admin, admin, moderator)
- Secure password hashing with bcrypt
- Activity tracking with last_login timestamps
- Account status management for security
- Separate from regular citizen users for security isolation

#### `system_settings`

Configurable system parameters for application-wide settings management.

- Key-value store for application configuration
- Data type validation (string, number, boolean)
- Version control with created_at/updated_at timestamps
- Centralized configuration management
- Dynamic settings without code deployment

#### `notification_templates`

Reusable templates for system notifications across different channels.

- Multi-channel support (email, SMS, push notifications)
- Template-based messaging for consistency
- Version control and audit trail
- Customizable subject and body content
- Supports multiple notification types

## Amazon Bedrock Titan Integration

The database schema is optimized for storing structured data from Amazon Bedrock Titan models:

### Image Analysis with Titan Embed Image v1

1. **Vector Embeddings**: 1024-dimensional image embeddings stored as `VECTOR(1024)` in TiDB
2. **Similarity Search**: Cosine distance calculations using `VEC_COSINE_DISTANCE()` function
3. **Pattern Analysis**: Clustering algorithms for identifying waste patterns and hotspots

### Structured Analysis Output

1. Initial waste detection data stored in confidence_score
2. Detailed waste classification through waste_type_id
3. Comprehensive analysis via:
   - severity_score (numerical assessment)
   - priority_level (categorical assessment)
   - analysis_notes (actionable recommendations)
   - full_description (natural language summary)
   - image_embedding (for similarity search)
   - location_embedding (for geographic analysis)

## Key Database Features

1. **Spatial Indexing:** Optimized geospatial queries for proximity searching and hotspot detection

   ```sql
   CREATE INDEX idx_reports_location ON reports(latitude, longitude);
   CREATE INDEX idx_hotspots_location ON hotspots(center_latitude, center_longitude);
   ```

2. **Status Workflows:** Report lifecycle management with state tracking

   ```sql
   CREATE INDEX idx_reports_status ON reports(status);
   CREATE INDEX idx_reports_status_date ON reports(status, report_date);
   ```

3. **Async Processing:** Queue system for handling large image analysis workloads

   ```sql
   CREATE INDEX idx_queue_status ON image_processing_queue(status);
   ```

4. **Admin Panel Performance:** Optimized indexes for administrative interface

   ```sql
   CREATE INDEX idx_admin_users_username ON admin_users(username);
   CREATE INDEX idx_admin_users_email ON admin_users(email);
   CREATE INDEX idx_system_settings_key ON system_settings(setting_key);
   CREATE INDEX idx_analysis_results_date ON analysis_results(analyzed_date);
   ```

5. **Security Features:**

   - User password hashing with PBKDF2-SHA256
   - Admin password hashing with bcrypt
   - Email verification system with OTP
   - JWT authentication with secure refresh tokens
   - API key authorization with scoped permissions
   - Role-based access control for admin panel
   - Separate authentication systems for users and admins

6. **Performance Optimizations:**
   - Pre-calculated statistics for dashboards
   - Efficient spatial indexes
   - Query optimizations for mobile app performance
   - Vector index optimization for similarity search

## Security and Scaling

1. **Data Security:**

   - User passwords stored with PBKDF2-SHA256 hashing
   - Images stored in AWS S3 (only URLs in database)
   - JWT authentication with secure refresh token rotation

2. **Indexing Strategy:**

   - Spatial indexes for location-based queries
   - Performance-focused indexes on commonly filtered fields
   - Full-text search capabilities for natural language queries

3. **Scaling Considerations:**

   - Queue-based architecture for horizontal scaling
   - Read-optimized reporting tables for analytics
   - Partitioning strategy for historical data

<div align="center">
  <p>Built with ❤️ for Timor-Leste</p>
</div>
