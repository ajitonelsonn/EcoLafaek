#!/bin/bash
# Quick update script for EcoLafaek API on Lightsail

set -e

INSTANCE_NAME="ecolafaek-api"
REGION="us-east-1"
KEY_PATH="$HOME/.ssh/LightsailDefaultKey-$REGION.pem"

echo "🔄 Updating EcoLafaek API on Lightsail..."

# Get instance IP
INSTANCE_IP=$(aws lightsail get-instance --instance-name $INSTANCE_NAME --region $REGION --query 'instance.publicIpAddress' --output text)
echo "Instance IP: $INSTANCE_IP"

# Create deployment package
echo "📦 Creating deployment package..."
TEMP_DIR=$(mktemp -d)
rsync -av --exclude='.git' --exclude='__pycache__' --exclude='.venv' --exclude='venv' --exclude='*.pyc' --exclude='.aws-sam' --exclude='node_modules' . $TEMP_DIR/
cd $TEMP_DIR
tar -czf ecolafaek-api.tar.gz *
cd - > /dev/null

# Upload and update
echo "📤 Uploading code..."
scp -i $KEY_PATH -o StrictHostKeyChecking=no $TEMP_DIR/ecolafaek-api.tar.gz ubuntu@$INSTANCE_IP:/tmp/

echo "🚀 Updating application..."
ssh -i $KEY_PATH -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
cd /home/ubuntu/ecolafaek-api
tar -xzf /tmp/ecolafaek-api.tar.gz
rm /tmp/ecolafaek-api.tar.gz
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart ecolafaek-api
echo "✅ Application updated and restarted!"
ENDSSH

# Cleanup
rm -rf $TEMP_DIR

echo "✅ Update complete!"
echo "Check status: ssh -i $KEY_PATH ubuntu@$INSTANCE_IP 'sudo systemctl status ecolafaek-api'"
