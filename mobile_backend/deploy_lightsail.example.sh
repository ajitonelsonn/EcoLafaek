#!/bin/bash
# EcoLafaek API - AWS Lightsail Deployment Script
# Deploys FastAPI app to Lightsail with HTTPS and domain setup

set -e  # Exit on error

echo "🚀 EcoLafaek API - Lightsail Deployment"
echo "========================================"
echo ""

# Configuration
INSTANCE_NAME="ecolafaek-api"
BUNDLE_ID="micro_3_0"  # 1 GB RAM, 2 vCPUs, 40 GB SSD
AVAILABILITY_ZONE="us-east-1a"
REGION="us-east-1"
DOMAIN="your_domain_api"
KEY_NAME="ecolafaek-key-2"
KEY_PATH="$HOME/.ssh/$KEY_NAME.pem"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured!"
    echo "Run: aws configure"
    exit 1
fi

echo "✅ AWS CLI configured"
echo ""

# Check if instance already exists
echo "🔍 Checking for existing instance..."
if aws lightsail get-instance --instance-name $INSTANCE_NAME --region $REGION &> /dev/null; then
    echo "⚠️  Instance '$INSTANCE_NAME' already exists!"
    read -p "Do you want to use the existing instance? (y/n): " use_existing
    if [[ $use_existing != "y" ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
    INSTANCE_EXISTS=true
else
    echo "✅ No existing instance found"
    INSTANCE_EXISTS=false
fi

# Create instance if it doesn't exist
if [[ $INSTANCE_EXISTS == false ]]; then
    echo ""
    echo "📦 Creating Lightsail instance..."
    echo "   Name: $INSTANCE_NAME"
    echo "   Bundle: $BUNDLE_ID (1 GB RAM, 2 vCPUs, 40 GB SSD)"
    echo "   Region: $REGION"
    echo ""

    aws lightsail create-instances \
        --instance-names $INSTANCE_NAME \
        --availability-zone $AVAILABILITY_ZONE \
        --blueprint-id ubuntu_22_04 \
        --bundle-id $BUNDLE_ID \
        --key-pair-name $KEY_NAME \
        --region $REGION

    echo "⏳ Waiting for instance to be running (this may take 2-3 minutes)..."
    for i in {1..60}; do
        STATE=$(aws lightsail get-instance-state --instance-name $INSTANCE_NAME --region $REGION --query 'state.name' --output text)
        if [[ $STATE == "running" ]]; then
            echo "✅ Instance is running!"
            break
        fi
        echo "   Status: $STATE (attempt $i/60)"
        sleep 5
    done
fi

# Get instance IP
echo ""
echo "🔍 Getting instance public IP..."
INSTANCE_IP=$(aws lightsail get-instance --instance-name $INSTANCE_NAME --region $REGION --query 'instance.publicIpAddress' --output text)
echo "✅ Instance IP: $INSTANCE_IP"

# Open firewall ports
echo ""
echo "🔥 Configuring firewall..."
aws lightsail put-instance-public-ports \
    --instance-name $INSTANCE_NAME \
    --port-infos '[
        {"fromPort":22,"toPort":22,"protocol":"tcp"},
        {"fromPort":80,"toPort":80,"protocol":"tcp"},
        {"fromPort":443,"toPort":443,"protocol":"tcp"},
        {"fromPort":8000,"toPort":8000,"protocol":"tcp"}
    ]' \
    --region $REGION
echo "✅ Firewall configured (ports 22, 80, 443, 8000)"

# SSH key already created at the beginning
echo ""
echo "🔑 SSH key ready: $KEY_PATH"

# Wait for SSH to be ready
echo ""
echo "⏳ Waiting for SSH to be ready..."
for i in {1..30}; do
    if ssh -i $KEY_PATH -o StrictHostKeyChecking=no -o ConnectTimeout=5 ubuntu@$INSTANCE_IP "echo SSH ready" &> /dev/null; then
        echo "✅ SSH is ready!"
        break
    fi
    echo "   Attempt $i/30..."
    sleep 10
done

# Create deployment package
echo ""
echo "📦 Creating deployment package..."
TEMP_DIR=$(mktemp -d)
rsync -av --exclude='.git' --exclude='__pycache__' --exclude='.venv' --exclude='venv' --exclude='*.pyc' --exclude='.aws-sam' --exclude='node_modules' . $TEMP_DIR/
cd $TEMP_DIR
tar -czf ecolafaek-api.tar.gz *
cd - > /dev/null
echo "✅ Deployment package created"

# Upload code
echo ""
echo "📤 Uploading code to instance..."
scp -i $KEY_PATH -o StrictHostKeyChecking=no $TEMP_DIR/ecolafaek-api.tar.gz ubuntu@$INSTANCE_IP:/tmp/
echo "✅ Code uploaded"

# Cleanup temp directory
rm -rf $TEMP_DIR

# Deploy and configure on instance
echo ""
echo "🚀 Deploying application..."
ssh -i $KEY_PATH -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
set -e

echo "📦 Extracting application..."
mkdir -p /home/ubuntu/ecolafaek-api
cd /home/ubuntu/ecolafaek-api
tar -xzf /tmp/ecolafaek-api.tar.gz
rm /tmp/ecolafaek-api.tar.gz

echo "🔧 Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv nginx certbot python3-certbot-nginx

echo "🐍 Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Application deployed!"
ENDSSH

echo "✅ Deployment complete!"

# Create systemd service
echo ""
echo "⚙️  Setting up systemd service..."
ssh -i $KEY_PATH -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
cat > /tmp/ecolafaek-api.service << 'EOF'
[Unit]
Description=EcoLafaek API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ecolafaek-api
Environment="PATH=/home/ubuntu/ecolafaek-api/venv/bin"
ExecStart=/home/ubuntu/ecolafaek-api/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/ecolafaek-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ecolafaek-api
sudo systemctl start ecolafaek-api

echo "✅ Systemd service configured and started"
ENDSSH

# Configure Nginx reverse proxy
echo ""
echo "🔧 Configuring Nginx..."
ssh -i $KEY_PATH -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << ENDSSH
cat > /tmp/ecolafaek-api << 'EOF'
server {
    listen 80;
    server_name your_domain_api;
    //example:server_name www.ecolafaek.xyz ecolafaek.xyz;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo mv /tmp/ecolafaek-api /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/ecolafaek-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "✅ Nginx configured"
ENDSSH

# Setup SSL with Let's Encrypt
echo ""
echo "🔒 Setting up HTTPS with Let's Encrypt..."
echo "⚠️  IMPORTANT: Make sure $DOMAIN points to $INSTANCE_IP before continuing!"
read -p "Press Enter when DNS is configured, or Ctrl+C to skip SSL setup..."

ssh -i $KEY_PATH -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << ENDSSH
sudo certbot --nginx -d your_domain_api -d ecolafaek.xyz --non-interactive --agree-tos --email lafaekaiajito@gmail.com --redirect
echo "✅ HTTPS configured!"
ENDSSH

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "═══════════════════════════════════════"
echo "📋 Deployment Summary"
echo "═══════════════════════════════════════"
echo "Instance Name: $INSTANCE_NAME"
echo "Public IP: $INSTANCE_IP"
echo "Domain: https://$DOMAIN"
echo "API Endpoint: https://$DOMAIN/api"
echo "Health Check: https://$DOMAIN/health"
echo ""
echo "═══════════════════════════════════════"
echo "📝 Next Steps"
echo "═══════════════════════════════════════"
echo "1. Update DNS: Point $DOMAIN to $INSTANCE_IP"
echo "2. Wait for DNS propagation (5-30 minutes)"
echo "3. Test API: curl https://$DOMAIN/health"
echo "4. Update your mobile app & dashboard to use: https://$DOMAIN"
echo ""
echo "═══════════════════════════════════════"
echo "🔧 Useful Commands"
echo "═══════════════════════════════════════"
echo "SSH to instance:"
echo "  ssh -i $KEY_PATH ubuntu@$INSTANCE_IP"
echo ""
echo "View logs:"
echo "  sudo journalctl -u ecolafaek-api -f"
echo ""
echo "Restart service:"
echo "  sudo systemctl restart ecolafaek-api"
echo ""
echo "Update code:"
echo "  ./update_lightsail.sh"
echo ""
