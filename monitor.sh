#!/bin/bash

# POS API - VPS Monitoring Script
# Usage: ./monitor.sh

echo "================================================"
echo "  POS API - VPS Resource Monitor"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# 1. System Memory
echo "📊 System Memory Usage:"
echo "─────────────────────────────────────────────"
free -h | awk 'NR==1{print $0} NR==2{
    total=$2; used=$3; free=$4; available=$7;
    used_pct=($3/$2)*100;
    printf "Total: %s | Used: %s (%.1f%%) | Free: %s | Available: %s\n", total, used, used_pct, free, available;
    if (used_pct > 85) printf "'${RED}'⚠️  WARNING: High memory usage!'${NC}'\n";
    else if (used_pct > 75) printf "'${YELLOW}'⚡ Caution: Memory usage elevated'${NC}'\n";
    else printf "'${GREEN}'✅ Memory usage healthy'${NC}'\n";
}'
echo ""

# 2. Swap Usage
echo "💾 Swap Usage:"
echo "─────────────────────────────────────────────"
if swapon --show &> /dev/null; then
    swapon --show --noheadings | awk '{
        printf "Swap: %s | Used: %s\n", $3, $4;
    }'
else
    echo "⚠️  No swap configured"
fi
echo ""

# 3. CPU Usage
echo "⚙️  CPU Usage:"
echo "─────────────────────────────────────────────"
top -bn1 | grep "Cpu(s)" | awk '{
    printf "CPU: %.1f%% used | %.1f%% idle\n", 100-$8, $8;
    if (100-$8 > 80) printf "'${RED}'⚠️  WARNING: High CPU usage!'${NC}'\n";
    else if (100-$8 > 60) printf "'${YELLOW}'⚡ Caution: CPU usage elevated'${NC}'\n";
    else printf "'${GREEN}'✅ CPU usage healthy'${NC}'\n";
}'
echo ""

# 4. Disk Usage
echo "💿 Disk Usage:"
echo "─────────────────────────────────────────────"
df -h / | awk 'NR==2{
    printf "Root: %s / %s used (%s)\n", $3, $2, $5;
    used_pct=$5+0;
    if (used_pct > 85) printf "'${RED}'⚠️  WARNING: Low disk space!'${NC}'\n";
    else if (used_pct > 75) printf "'${YELLOW}'⚡ Caution: Disk usage elevated'${NC}'\n";
    else printf "'${GREEN}'✅ Disk usage healthy'${NC}'\n";
}'
echo ""

# 5. Docker Container Status
echo "🐳 Docker Container Status:"
echo "─────────────────────────────────────────────"
if command -v docker &> /dev/null; then
    if docker ps --filter "name=travel" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q travel; then
        docker ps --filter "name=travel" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""

        # Container health
        api_health=$(docker inspect travel_api_prod --format='{{.State.Health.Status}}' 2>/dev/null)
        mysql_health=$(docker inspect travel_mysql_prod --format='{{.State.Health.Status}}' 2>/dev/null)

        if [ "$api_health" == "healthy" ]; then
            echo -e "${GREEN}✅ API Container: Healthy${NC}"
        else
            echo -e "${RED}❌ API Container: $api_health${NC}"
        fi

        if [ "$mysql_health" == "healthy" ]; then
            echo -e "${GREEN}✅ MySQL Container: Healthy${NC}"
        else
            echo -e "${RED}❌ MySQL Container: $mysql_health${NC}"
        fi
    else
        echo "⚠️  No travel containers running"
    fi
else
    echo "⚠️  Docker not installed"
fi
echo ""

# 6. Docker Resource Usage
echo "📈 Docker Container Resources:"
echo "─────────────────────────────────────────────"
if command -v docker &> /dev/null; then
    if docker ps --filter "name=travel" -q | grep -q .; then
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" \
            $(docker ps --filter "name=travel" -q)
    else
        echo "No containers to monitor"
    fi
else
    echo "Docker not available"
fi
echo ""

# 7. Recent Container Logs (Errors)
echo "📋 Recent Container Errors (last 50 lines):"
echo "─────────────────────────────────────────────"
if docker ps --filter "name=travel_api_prod" -q | grep -q .; then
    error_count=$(docker logs travel_api_prod --tail 50 2>&1 | grep -i "error" | wc -l)
    if [ "$error_count" -gt 0 ]; then
        echo -e "${RED}⚠️  Found $error_count error(s) in API logs:${NC}"
        docker logs travel_api_prod --tail 50 2>&1 | grep -i "error" | tail -5
    else
        echo -e "${GREEN}✅ No recent errors in API logs${NC}"
    fi
else
    echo "API container not running"
fi
echo ""

# 8. Network Connectivity
echo "🌐 Network Connectivity:"
echo "─────────────────────────────────────────────"
if docker ps --filter "name=travel_api_prod" -q | grep -q .; then
    if docker exec travel_api_prod wget --quiet --tries=1 --spider http://localhost:8082/health 2>/dev/null; then
        echo -e "${GREEN}✅ API health endpoint responding${NC}"
    else
        echo -e "${RED}❌ API health endpoint not responding${NC}"
    fi
else
    echo "API container not running"
fi
echo ""

# 9. Database Connections
echo "🗄️  PostgreSQL Connection Status:"
echo "─────────────────────────────────────────────"
# Check if using local Docker Postgres or remote
if docker ps --filter "name=postgres" -q | grep -q .; then
    # Local Docker Postgres
    connections=$(docker exec postgres psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-postgres} -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
    max_connections=$(docker exec postgres psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-postgres} -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ')

    if [ -n "$connections" ] && [ -n "$max_connections" ]; then
        usage_pct=$((connections * 100 / max_connections))
        echo "Active Connections: $connections / $max_connections ($usage_pct%)"
        echo "Source: Local Docker Container"

        if [ "$usage_pct" -gt 80 ]; then
            echo -e "${RED}⚠️  WARNING: High connection usage!${NC}"
        elif [ "$usage_pct" -gt 60 ]; then
            echo -e "${YELLOW}⚡ Caution: Connection usage elevated${NC}"
        else
            echo -e "${GREEN}✅ Connection usage healthy${NC}"
        fi
    else
        echo "Could not retrieve connection info from local Docker"
    fi
else
    # Remote Postgres (e.g. Supabase)
    # We can't easily check connection count directly without psql client and credentials
    # So we'll check if the backend can connect via its health/status endpoint if available
    # Or just ping the host if we can extract it from DATABASE_URL

    if [ -n "$DATABASE_URL" ]; then
        # Extract host from DATABASE_URL (postgres://user:pass@host:port/db)
        db_host=$(echo $DATABASE_URL | sed -e 's/.*@//' -e 's/[:\/].*//')

        echo "Source: Remote Database (Supabase/External)"
        echo "Target: $db_host"

        if ping -c 1 -W 2 $db_host &> /dev/null; then
             echo -e "${GREEN}✅ Database host is reachable${NC}"
        else
             echo -e "${YELLOW}⚠️  Database host not reachable via ping (might be firewall blocking)${NC}"
        fi
    else
        echo "⚠️  No local Postgres container found and DATABASE_URL not set"
    fi
fi
echo ""

# 10. PM2 Process Status
echo "🚀 PM2 Process Status:"
echo "─────────────────────────────────────────────"
if command -v pm2 &> /dev/null; then
    pm2 list
    echo ""
else
    echo "⚠️  PM2 not installed"
fi
echo ""

# 11. Summary
echo "================================================"
echo "  Summary & Recommendations"
echo "================================================"

# Check if any critical issues
critical=0

# Memory check
mem_used=$(free | awk 'NR==2{printf "%.0f", ($3/$2)*100}')
if [ "$mem_used" -gt 85 ]; then
    echo -e "${RED}🚨 CRITICAL: Memory usage > 85%${NC}"
    echo "   → Consider restarting containers or optimizing WordPress"
    critical=1
fi

# Disk check
disk_used=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
if [ "$disk_used" -gt 85 ]; then
    echo -e "${RED}🚨 CRITICAL: Disk usage > 85%${NC}"
    echo "   → Run: docker system prune -a"
    critical=1
fi

# Container check
if command -v docker &> /dev/null && docker ps --filter "name=pos-api-prod" -q | grep -q .; then
    # Docker is running and container exists
    :
elif command -v docker &> /dev/null; then
    # Docker exists but container not running
    echo -e "${YELLOW}⚠️  WARNING: Docker API container not running${NC}"
    # Not critical if we are using PM2
fi

# PM2 Check
if command -v pm2 &> /dev/null; then
    if pm2 jlist | grep -q '"status":"errored"'; then
        echo -e "${RED}🚨 CRITICAL: Found errored PM2 processes${NC}"
        echo "   → Run: pm2 logs"
        critical=1
    fi
fi

if [ "$critical" -eq 0 ]; then
    echo -e "${GREEN}✅ All systems operational!${NC}"
fi

echo ""
echo "Last updated: $(date)"
echo "================================================"
