#!/bin/bash
# Quick update script for EcoLafaek API on Lightsail

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

INSTANCE_NAME="ecolafaek-api"
REGION="us-east-1"
KEY_PATH="$HOME/.ssh/LightsailDefaultKey-$REGION.pem"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🔄 Updating EcoLafaek API on Lightsail${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found in current directory${NC}"
    echo -e "${YELLOW}Please run this script from the mobile_backend directory${NC}"
    exit 1
fi

# Get instance IP
echo -e "${YELLOW}📡 Getting Lightsail instance IP...${NC}"
INSTANCE_IP=$(aws lightsail get-instance --instance-name $INSTANCE_NAME --region $REGION --query 'instance.publicIpAddress' --output text 2>/dev/null)

if [ -z "$INSTANCE_IP" ] || [ "$INSTANCE_IP" == "None" ]; then
    echo -e "${RED}❌ Failed to get instance IP${NC}"
    echo -e "${YELLOW}Please check:${NC}"
    echo -e "  - Instance name: ${INSTANCE_NAME}"
    echo -e "  - Region: ${REGION}"
    echo -e "  - AWS CLI is configured"
    exit 1
fi

echo -e "${GREEN}✅ Instance IP: ${INSTANCE_IP}${NC}"
echo ""

# Ask what to update
echo -e "${BLUE}What do you want to update?${NC}"
echo "  1) Environment variables only (.env file)"
echo "  2) Full application (code + .env + dependencies)"
echo "  3) Both (sequentially)"
echo ""
read -p "Enter choice [1-3]: " UPDATE_CHOICE

case $UPDATE_CHOICE in
    1)
        echo -e "${YELLOW}📤 Updating environment variables only...${NC}"

        # Backup existing .env on server
        echo -e "${YELLOW}🔄 Backing up existing .env...${NC}"
        ssh -i $KEY_PATH -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
            if [ -f /home/ubuntu/ecolafaek-api/.env ]; then
                cp /home/ubuntu/ecolafaek-api/.env /home/ubuntu/ecolafaek-api/.env.backup.$(date +%Y%m%d_%H%M%S)
                echo "✅ Backup created"
            fi
ENDSSH

        # Upload new .env file
        echo -e "${YELLOW}📤 Uploading new .env file...${NC}"
        scp -i $KEY_PATH -o StrictHostKeyChecking=no .env ubuntu@$INSTANCE_IP:/home/ubuntu/ecolafaek-api/.env

        # Set permissions and restart
        echo -e "${YELLOW}🔒 Setting permissions and restarting...${NC}"
        ssh -i $KEY_PATH -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
            chmod 600 /home/ubuntu/ecolafaek-api/.env
            sudo systemctl restart ecolafaek-api
            sleep 3
            if sudo systemctl is-active --quiet ecolafaek-api; then
                echo "✅ Service restarted successfully"
            else
                echo "❌ Service failed to start, showing logs:"
                sudo journalctl -u ecolafaek-api -n 20 --no-pager
                exit 1
            fi
ENDSSH

        echo -e "${GREEN}✅ Environment variables updated!${NC}"
        ;;

    2)
        echo -e "${YELLOW}📦 Creating deployment package...${NC}"
        TEMP_DIR=$(mktemp -d)
        rsync -av --exclude='.git' --exclude='__pycache__' --exclude='.venv' --exclude='venv' --exclude='*.pyc' --exclude='.aws-sam' --exclude='node_modules' . $TEMP_DIR/
        cd $TEMP_DIR
        tar -czf ecolafaek-api.tar.gz *
        cd - > /dev/null

        echo -e "${YELLOW}📤 Uploading code...${NC}"
        scp -i $KEY_PATH -o StrictHostKeyChecking=no $TEMP_DIR/ecolafaek-api.tar.gz ubuntu@$INSTANCE_IP:/tmp/

        echo -e "${YELLOW}🚀 Updating application...${NC}"
        ssh -i $KEY_PATH -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
            cd /home/ubuntu/ecolafaek-api
            tar -xzf /tmp/ecolafaek-api.tar.gz
            rm /tmp/ecolafaek-api.tar.gz
            source venv/bin/activate
            pip install -r requirements.txt
            sudo systemctl restart ecolafaek-api
            sleep 3
            if sudo systemctl is-active --quiet ecolafaek-api; then
                echo "✅ Application updated and restarted!"
            else
                echo "❌ Service failed to start, showing logs:"
                sudo journalctl -u ecolafaek-api -n 20 --no-pager
                exit 1
            fi
ENDSSH

        # Cleanup
        rm -rf $TEMP_DIR
        echo -e "${GREEN}✅ Full update complete!${NC}"
        ;;

    3)
        echo -e "${YELLOW}🔄 Updating both environment and code...${NC}"

        # First update .env
        echo -e "${BLUE}[1/2] Updating environment variables...${NC}"
        scp -i $KEY_PATH -o StrictHostKeyChecking=no .env ubuntu@$INSTANCE_IP:/home/ubuntu/ecolafaek-api/.env
        ssh -i $KEY_PATH -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP "chmod 600 /home/ubuntu/ecolafaek-api/.env"

        # Then update code
        echo -e "${BLUE}[2/2] Updating application code...${NC}"
        TEMP_DIR=$(mktemp -d)
        rsync -av --exclude='.git' --exclude='__pycache__' --exclude='.venv' --exclude='venv' --exclude='*.pyc' --exclude='.aws-sam' --exclude='node_modules' . $TEMP_DIR/
        cd $TEMP_DIR
        tar -czf ecolafaek-api.tar.gz *
        cd - > /dev/null

        scp -i $KEY_PATH -o StrictHostKeyChecking=no $TEMP_DIR/ecolafaek-api.tar.gz ubuntu@$INSTANCE_IP:/tmp/

        ssh -i $KEY_PATH -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
            cd /home/ubuntu/ecolafaek-api
            tar -xzf /tmp/ecolafaek-api.tar.gz
            rm /tmp/ecolafaek-api.tar.gz
            source venv/bin/activate
            pip install -r requirements.txt
            sudo systemctl restart ecolafaek-api
            sleep 3
            if sudo systemctl is-active --quiet ecolafaek-api; then
                echo "✅ Everything updated and restarted!"
            else
                echo "❌ Service failed to start, showing logs:"
                sudo journalctl -u ecolafaek-api -n 20 --no-pager
                exit 1
            fi
ENDSSH

        rm -rf $TEMP_DIR
        echo -e "${GREEN}✅ Complete update finished!${NC}"
        ;;

    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Update Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}💡 Useful commands:${NC}"
echo -e "  Check status: ssh -i $KEY_PATH ubuntu@$INSTANCE_IP 'sudo systemctl status ecolafaek-api'"
echo -e "  View logs:    ssh -i $KEY_PATH ubuntu@$INSTANCE_IP 'sudo journalctl -u ecolafaek-api -f'"
echo ""
