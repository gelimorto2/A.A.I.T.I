#!/bin/bash

# Sprint 4: Automated Dependency Security Scanning Script
# Comprehensive security scanning with npm audit, Snyk, and GitHub Dependabot integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MAX_CRITICAL_VULNS=0
MAX_HIGH_VULNS=3
MAX_MODERATE_VULNS=10
AUDIT_LEVEL="moderate"
REPORT_DIR="./security-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}🔒 Starting comprehensive dependency security scan...${NC}"
echo "Timestamp: $(date)"
echo "Report directory: $REPORT_DIR"
echo ""

# Create reports directory
mkdir -p "$REPORT_DIR"

# Function to print colored output
print_status() {
    local level=$1
    local message=$2
    case $level in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
    esac
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Initialize scan results
SCAN_RESULTS=""
TOTAL_VULNERABILITIES=0
CRITICAL_COUNT=0
HIGH_COUNT=0
MODERATE_COUNT=0
LOW_COUNT=0
SCAN_FAILED=false

# 1. NPM AUDIT SCAN
print_status "INFO" "Running npm audit scan..."
echo "============================================"

if command_exists npm; then
    # Run npm audit and capture output
    NPM_AUDIT_FILE="$REPORT_DIR/npm_audit_$TIMESTAMP.json"
    NPM_AUDIT_REPORT="$REPORT_DIR/npm_audit_report_$TIMESTAMP.txt"
    
    if npm audit --json > "$NPM_AUDIT_FILE" 2>/dev/null; then
        print_status "SUCCESS" "npm audit completed successfully"
        
        # Parse npm audit results
        if command_exists jq && [ -f "$NPM_AUDIT_FILE" ]; then
            CRITICAL_COUNT=$(jq -r '.metadata.vulnerabilities.critical // 0' "$NPM_AUDIT_FILE")
            HIGH_COUNT=$(jq -r '.metadata.vulnerabilities.high // 0' "$NPM_AUDIT_FILE")
            MODERATE_COUNT=$(jq -r '.metadata.vulnerabilities.moderate // 0' "$NPM_AUDIT_FILE")
            LOW_COUNT=$(jq -r '.metadata.vulnerabilities.low // 0' "$NPM_AUDIT_FILE")
            
            TOTAL_VULNERABILITIES=$((CRITICAL_COUNT + HIGH_COUNT + MODERATE_COUNT + LOW_COUNT))
            
            echo "Critical: $CRITICAL_COUNT" > "$NPM_AUDIT_REPORT"
            echo "High: $HIGH_COUNT" >> "$NPM_AUDIT_REPORT"
            echo "Moderate: $MODERATE_COUNT" >> "$NPM_AUDIT_REPORT"
            echo "Low: $LOW_COUNT" >> "$NPM_AUDIT_REPORT"
            echo "Total: $TOTAL_VULNERABILITIES" >> "$NPM_AUDIT_REPORT"
            
            if [ "$TOTAL_VULNERABILITIES" -gt 0 ]; then
                print_status "WARNING" "Found $TOTAL_VULNERABILITIES vulnerabilities (Critical: $CRITICAL_COUNT, High: $HIGH_COUNT, Moderate: $MODERATE_COUNT, Low: $LOW_COUNT)"
                
                # Generate detailed report
                echo "" >> "$NPM_AUDIT_REPORT"
                echo "DETAILED VULNERABILITIES:" >> "$NPM_AUDIT_REPORT"
                jq -r '.vulnerabilities | to_entries[] | "\(.key): \(.value.severity) - \(.value.title)"' "$NPM_AUDIT_FILE" >> "$NPM_AUDIT_REPORT"
            else
                print_status "SUCCESS" "No vulnerabilities found in npm audit"
            fi
        else
            print_status "WARNING" "jq not available - cannot parse detailed npm audit results"
        fi
    else
        # npm audit failed, likely due to vulnerabilities
        npm audit > "$NPM_AUDIT_REPORT" 2>&1 || true
        print_status "WARNING" "npm audit found vulnerabilities - check report for details"
        
        # Try to extract basic counts from text output
        if [ -f "$NPM_AUDIT_REPORT" ]; then
            CRITICAL_COUNT=$(grep -o "critical" "$NPM_AUDIT_REPORT" | wc -l || echo "0")
            HIGH_COUNT=$(grep -o "high" "$NPM_AUDIT_REPORT" | wc -l || echo "0")
            MODERATE_COUNT=$(grep -o "moderate" "$NPM_AUDIT_REPORT" | wc -l || echo "0")
            LOW_COUNT=$(grep -o "low" "$NPM_AUDIT_REPORT" | wc -l || echo "0")
        fi
    fi
    
    # Check if vulnerabilities exceed thresholds
    if [ "$CRITICAL_COUNT" -gt "$MAX_CRITICAL_VULNS" ]; then
        print_status "ERROR" "Critical vulnerabilities ($CRITICAL_COUNT) exceed threshold ($MAX_CRITICAL_VULNS)"
        SCAN_FAILED=true
    fi
    
    if [ "$HIGH_COUNT" -gt "$MAX_HIGH_VULNS" ]; then
        print_status "ERROR" "High vulnerabilities ($HIGH_COUNT) exceed threshold ($MAX_HIGH_VULNS)"
        SCAN_FAILED=true
    fi
    
    if [ "$MODERATE_COUNT" -gt "$MAX_MODERATE_VULNS" ]; then
        print_status "ERROR" "Moderate vulnerabilities ($MODERATE_COUNT) exceed threshold ($MAX_MODERATE_VULNS)"
        SCAN_FAILED=true
    fi
    
else
    print_status "ERROR" "npm not found - cannot run npm audit"
    SCAN_FAILED=true
fi

echo ""

# 2. SNYK SCAN (if available)
print_status "INFO" "Checking for Snyk CLI..."
echo "============================================"

if command_exists snyk; then
    print_status "INFO" "Running Snyk security scan..."
    
    SNYK_REPORT="$REPORT_DIR/snyk_report_$TIMESTAMP.json"
    SNYK_TEXT_REPORT="$REPORT_DIR/snyk_report_$TIMESTAMP.txt"
    
    # Authenticate Snyk if token is available
    if [ -n "$SNYK_TOKEN" ]; then
        snyk auth "$SNYK_TOKEN" >/dev/null 2>&1 || true
    fi
    
    # Run Snyk test
    if snyk test --json > "$SNYK_REPORT" 2>/dev/null; then
        print_status "SUCCESS" "Snyk scan completed successfully"
        
        # Generate human-readable report
        snyk test > "$SNYK_TEXT_REPORT" 2>&1 || true
        
        # Parse Snyk results
        if command_exists jq && [ -f "$SNYK_REPORT" ]; then
            SNYK_VULNS=$(jq -r '.vulnerabilities | length' "$SNYK_REPORT" 2>/dev/null || echo "0")
            if [ "$SNYK_VULNS" -gt 0 ]; then
                print_status "WARNING" "Snyk found $SNYK_VULNS vulnerabilities"
            else
                print_status "SUCCESS" "Snyk found no vulnerabilities"
            fi
        fi
        
    else
        print_status "WARNING" "Snyk found vulnerabilities or scan failed"
        snyk test > "$SNYK_TEXT_REPORT" 2>&1 || true
    fi
    
    # Run Snyk monitor (send results to Snyk dashboard)
    if [ -n "$SNYK_TOKEN" ]; then
        snyk monitor >/dev/null 2>&1 && print_status "SUCCESS" "Results sent to Snyk dashboard" || print_status "WARNING" "Failed to send results to Snyk dashboard"
    fi
    
else
    print_status "INFO" "Snyk CLI not found - skipping Snyk scan"
    print_status "INFO" "Install with: npm install -g snyk"
fi

echo ""

# 3. CHECK FOR OUTDATED PACKAGES
print_status "INFO" "Checking for outdated packages..."
echo "============================================"

if command_exists npm; then
    OUTDATED_REPORT="$REPORT_DIR/outdated_packages_$TIMESTAMP.txt"
    
    if npm outdated > "$OUTDATED_REPORT" 2>&1; then
        print_status "SUCCESS" "All packages are up to date"
    else
        OUTDATED_COUNT=$(wc -l < "$OUTDATED_REPORT" 2>/dev/null || echo "0")
        if [ "$OUTDATED_COUNT" -gt 1 ]; then # First line is header
            print_status "WARNING" "Found $((OUTDATED_COUNT - 1)) outdated packages"
            echo "Top 5 outdated packages:"
            head -n 6 "$OUTDATED_REPORT" | tail -n 5
        else
            print_status "SUCCESS" "All packages are up to date"
        fi
    fi
fi

echo ""

# 4. CHECK PACKAGE-LOCK.JSON INTEGRITY
print_status "INFO" "Checking package-lock.json integrity..."
echo "============================================"

if [ -f "package-lock.json" ]; then
    if npm ci --dry-run >/dev/null 2>&1; then
        print_status "SUCCESS" "package-lock.json is consistent with package.json"
    else
        print_status "WARNING" "package-lock.json may be out of sync with package.json"
        print_status "INFO" "Consider running: npm install"
    fi
else
    print_status "WARNING" "package-lock.json not found - dependency versions not locked"
fi

echo ""

# 5. LICENSE COMPLIANCE CHECK
print_status "INFO" "Checking license compliance..."
echo "============================================"

if command_exists npm && command_exists jq; then
    LICENSE_REPORT="$REPORT_DIR/licenses_$TIMESTAMP.txt"
    
    npm list --json > /tmp/npm_list.json 2>/dev/null || true
    
    if [ -f /tmp/npm_list.json ]; then
        # Extract licenses
        jq -r '.. | objects | select(has("name") and has("version")) | "\(.name)@\(.version): \(.license // "UNKNOWN")"' /tmp/npm_list.json | sort -u > "$LICENSE_REPORT"
        
        # Check for problematic licenses
        PROBLEMATIC_LICENSES="GPL|AGPL|LGPL|CPAL|EPL|MPL"
        PROBLEMATIC_COUNT=$(grep -E "$PROBLEMATIC_LICENSES" "$LICENSE_REPORT" | wc -l || echo "0")
        
        if [ "$PROBLEMATIC_COUNT" -gt 0 ]; then
            print_status "WARNING" "Found $PROBLEMATIC_COUNT packages with potentially problematic licenses"
            echo "Problematic licenses found:"
            grep -E "$PROBLEMATIC_LICENSES" "$LICENSE_REPORT" | head -5
        else
            print_status "SUCCESS" "No problematic licenses detected"
        fi
        
        # Count unknown licenses
        UNKNOWN_COUNT=$(grep "UNKNOWN" "$LICENSE_REPORT" | wc -l || echo "0")
        if [ "$UNKNOWN_COUNT" -gt 0 ]; then
            print_status "WARNING" "Found $UNKNOWN_COUNT packages with unknown licenses"
        fi
        
        rm -f /tmp/npm_list.json
    fi
fi

echo ""

# 6. GENERATE COMPREHENSIVE REPORT
print_status "INFO" "Generating comprehensive security report..."
echo "============================================"

SUMMARY_REPORT="$REPORT_DIR/security_summary_$TIMESTAMP.md"

cat > "$SUMMARY_REPORT" << EOF
# Dependency Security Scan Report

**Scan Date:** $(date)  
**Project:** A.A.I.T.I Trading Platform  
**Scan Duration:** $(date +%s) seconds  

## Executive Summary

- **Total Vulnerabilities Found:** $TOTAL_VULNERABILITIES
- **Critical:** $CRITICAL_COUNT
- **High:** $HIGH_COUNT  
- **Moderate:** $MODERATE_COUNT
- **Low:** $LOW_COUNT

## Scan Results

### npm audit
- Status: $([ "$TOTAL_VULNERABILITIES" -eq 0 ] && echo "✅ PASSED" || echo "⚠️ VULNERABILITIES FOUND")
- Report: npm_audit_report_$TIMESTAMP.txt

### Snyk Analysis
- Status: $([ -f "$SNYK_REPORT" ] && echo "✅ COMPLETED" || echo "⏭️ SKIPPED")
- Report: $([ -f "$SNYK_TEXT_REPORT" ] && echo "snyk_report_$TIMESTAMP.txt" || echo "N/A")

### Package Updates
- Outdated packages report: outdated_packages_$TIMESTAMP.txt

### License Compliance
- License analysis: licenses_$TIMESTAMP.txt

## Recommendations

EOF

# Add recommendations based on findings
if [ "$CRITICAL_COUNT" -gt 0 ] || [ "$HIGH_COUNT" -gt 0 ]; then
    echo "- 🚨 **URGENT:** Address critical and high severity vulnerabilities immediately" >> "$SUMMARY_REPORT"
    echo "- Run \`npm audit fix\` to automatically fix vulnerabilities where possible" >> "$SUMMARY_REPORT"
    echo "- Manually review and update packages that cannot be automatically fixed" >> "$SUMMARY_REPORT"
fi

if [ "$MODERATE_COUNT" -gt "$MAX_MODERATE_VULNS" ]; then
    echo "- ⚠️ Review and address moderate severity vulnerabilities" >> "$SUMMARY_REPORT"
fi

if [ -f "$OUTDATED_REPORT" ] && [ "$(wc -l < "$OUTDATED_REPORT")" -gt 1 ]; then
    echo "- 📦 Update outdated packages to latest versions" >> "$SUMMARY_REPORT"
    echo "- Test thoroughly after updates to ensure compatibility" >> "$SUMMARY_REPORT"
fi

echo "- 🔄 Schedule regular dependency scans (weekly recommended)" >> "$SUMMARY_REPORT"
echo "- 🤖 Consider implementing automated dependency updates with Dependabot" >> "$SUMMARY_REPORT"
echo "- 📊 Monitor security advisories for your dependencies" >> "$SUMMARY_REPORT"

echo "" >> "$SUMMARY_REPORT"
echo "## Files Generated" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"
ls -la "$REPORT_DIR"/*"$TIMESTAMP"* | awk '{print "- " $9}' >> "$SUMMARY_REPORT"

print_status "SUCCESS" "Comprehensive report generated: $SUMMARY_REPORT"

# 7. GITHUB DEPENDABOT CHECK
print_status "INFO" "Checking GitHub Dependabot configuration..."
echo "============================================"

if [ -f ".github/dependabot.yml" ]; then
    print_status "SUCCESS" "Dependabot configuration found"
    
    # Validate dependabot config
    if grep -q "package-ecosystem.*npm" ".github/dependabot.yml"; then
        print_status "SUCCESS" "npm ecosystem configured in Dependabot"
    else
        print_status "WARNING" "npm ecosystem not configured in Dependabot"
    fi
    
    if grep -q "schedule:" ".github/dependabot.yml"; then
        SCHEDULE=$(grep -A1 "schedule:" ".github/dependabot.yml" | tail -1 | sed 's/.*interval: *//')
        print_status "INFO" "Dependabot schedule: $SCHEDULE"
    fi
else
    print_status "WARNING" "Dependabot not configured"
    print_status "INFO" "Consider adding .github/dependabot.yml for automated dependency updates"
    
    # Generate sample dependabot config
    DEPENDABOT_CONFIG="$REPORT_DIR/sample_dependabot.yml"
    cat > "$DEPENDABOT_CONFIG" << 'EOF'
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    reviewers:
      - "security-team"
    assignees:
      - "lead-developer"
    commit-message:
      prefix: "security"
      include: "scope"
  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
EOF
    print_status "INFO" "Sample Dependabot config generated: $DEPENDABOT_CONFIG"
fi

echo ""

# 8. FINAL SUMMARY
print_status "INFO" "Scan Summary"
echo "============================================"
echo "📊 Total vulnerabilities found: $TOTAL_VULNERABILITIES"
echo "🔴 Critical: $CRITICAL_COUNT (max allowed: $MAX_CRITICAL_VULNS)"
echo "🟠 High: $HIGH_COUNT (max allowed: $MAX_HIGH_VULNS)"
echo "🟡 Moderate: $MODERATE_COUNT (max allowed: $MAX_MODERATE_VULNS)"
echo "🟢 Low: $LOW_COUNT"
echo ""
echo "📁 Reports generated in: $REPORT_DIR"
echo "📋 Summary report: $SUMMARY_REPORT"
echo ""

# 9. EXIT WITH APPROPRIATE CODE
if [ "$SCAN_FAILED" = true ]; then
    print_status "ERROR" "Security scan FAILED - vulnerabilities exceed acceptable thresholds"
    echo ""
    echo "🚨 RECOMMENDED ACTIONS:"
    echo "1. Review detailed reports in $REPORT_DIR"
    echo "2. Run 'npm audit fix' to auto-fix vulnerabilities"
    echo "3. Manually update packages that cannot be auto-fixed"
    echo "4. Re-run this scan after fixes"
    echo ""
    exit 1
else
    print_status "SUCCESS" "Security scan PASSED - all vulnerability counts within acceptable limits"
    echo ""
    echo "✅ NEXT STEPS:"
    echo "1. Review summary report: $SUMMARY_REPORT"
    echo "2. Consider updating outdated packages"
    echo "3. Schedule regular security scans"
    echo ""
    exit 0
fi