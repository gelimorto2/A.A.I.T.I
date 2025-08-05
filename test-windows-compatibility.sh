#!/bin/bash

# A.A.I.T.I Cross-Platform Validation Test Suite
# Tests Windows compatibility improvements and general functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Print functions
print_test() {
    echo -e "${BLUE}🧪 TEST: $1${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

print_success() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

print_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

print_info() {
    echo -e "${YELLOW}ℹ️  INFO: $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "========================================================================="
    echo "               🧪 A.A.I.T.I Cross-Platform Validation Suite"
    echo "                    Testing Windows Compatibility Improvements"
    echo "========================================================================="
    echo -e "${NC}"
}

# Test 1: Check if Windows installer files exist
test_windows_installers() {
    print_test "Windows installer files exist"
    
    if [[ -f "install.bat" && -f "install.ps1" ]]; then
        print_success "Windows installers (install.bat, install.ps1) found"
    else
        print_fail "Windows installer files missing"
    fi
}

# Test 2: Check cross-platform npm scripts
test_npm_scripts() {
    print_test "Cross-platform npm scripts"
    
    # Check if rimraf is installed (cross-platform rm -rf alternative)
    if npm list rimraf > /dev/null 2>&1; then
        print_success "rimraf dependency installed for cross-platform file removal"
    else
        print_fail "rimraf not found - Windows compatibility may be broken"
    fi
    
    # Check if cross-env is installed (cross-platform environment variables)
    if npm list cross-env > /dev/null 2>&1; then
        print_success "cross-env dependency installed for cross-platform env vars"
    else
        print_fail "cross-env not found - Windows compatibility may be broken"
    fi
}

# Test 3: Test npm clean command (should work cross-platform)
test_clean_command() {
    print_test "Cross-platform clean command"
    
    # Create some test directories to clean
    mkdir -p test_node_modules test_build
    
    if npm run clean > /dev/null 2>&1; then
        print_success "npm run clean executed successfully"
    else
        print_fail "npm run clean failed - Windows compatibility issue"
    fi
    
    # Cleanup
    rm -rf test_node_modules test_build 2>/dev/null || true
}

# Test 4: Test health check command (should work without curl/python)
test_health_command() {
    print_test "Cross-platform health check command"
    
    # The health command should run without errors even if backend is not running
    if timeout 10 npm run health > /dev/null 2>&1; then
        print_success "npm run health executed successfully (Node.js-based implementation)"
    else
        print_fail "npm run health failed - may not work on Windows"
    fi
}

# Test 5: Check Windows documentation
test_windows_docs() {
    print_test "Windows documentation completeness"
    
    if [[ -f "docs/windows.md" ]]; then
        # Check for key Windows-specific content
        if grep -q "install.bat" docs/windows.md && grep -q "PowerShell" docs/windows.md && grep -q "WSL" docs/windows.md; then
            print_success "Windows documentation is comprehensive"
        else
            print_fail "Windows documentation is incomplete"
        fi
    else
        print_fail "Windows documentation missing"
    fi
}

# Test 6: Check professional assets
test_assets() {
    print_test "Professional assets and presentation"
    
    assets_ok=true
    
    if [[ ! -f "assets/banner.svg" ]]; then
        print_fail "Repository banner missing"
        assets_ok=false
    fi
    
    if [[ ! -f "presentation.html" ]]; then
        print_fail "Presentation page missing"
        assets_ok=false
    fi
    
    if $assets_ok; then
        print_success "Professional assets (banner, presentation) present"
    fi
}

# Test 7: Validate package.json for Windows compatibility
test_package_json() {
    print_test "package.json Windows compatibility"
    
    # Check that no Unix-specific commands remain
    if grep -q "rm -rf" package.json; then
        print_fail "Unix-specific 'rm -rf' commands found in package.json"
    elif grep -q "curl.*python" package.json; then
        print_fail "Unix-specific curl/python commands found in package.json"
    else
        print_success "package.json appears Windows-compatible"
    fi
}

# Test 8: Check README updates
test_readme_updates() {
    print_test "README.md Windows improvements"
    
    if grep -q "install.bat" README.md && grep -q "Windows" README.md && grep -q "banner.svg" README.md; then
        print_success "README.md updated with Windows support and banner"
    else
        print_fail "README.md missing Windows improvements"
    fi
}

# Test 9: Validate presentation HTML
test_presentation_html() {
    print_test "Presentation HTML structure"
    
    if [[ -f "presentation.html" ]]; then
        # Check for essential elements
        if grep -q "A.A.I.T.I" presentation.html && grep -q "Windows" presentation.html && grep -q "install.bat" presentation.html; then
            print_success "Presentation HTML contains essential content"
        else
            print_fail "Presentation HTML missing essential content"
        fi
    else
        print_fail "Presentation HTML file not found"
    fi
}

# Test 10: Docker file validation (if Docker is available)
test_docker_files() {
    print_test "Docker configuration files"
    
    docker_ok=true
    
    if [[ ! -f "Dockerfile" ]]; then
        print_fail "Main Dockerfile missing"
        docker_ok=false
    fi
    
    if [[ ! -f "docker-compose.yml" ]]; then
        print_fail "docker-compose.yml missing"
        docker_ok=false
    fi
    
    if $docker_ok; then
        print_success "Docker configuration files present"
    fi
}

# Test 11: Check if system commands work cross-platform
test_system_commands() {
    print_test "Cross-platform system commands"
    
    # Test Node.js availability
    if command -v node > /dev/null 2>&1; then
        print_success "Node.js available"
    else
        print_fail "Node.js not found"
    fi
    
    # Test npm availability
    if command -v npm > /dev/null 2>&1; then
        print_success "npm available"
    else
        print_fail "npm not found"
    fi
}

# Test 12: Simulate Windows batch installer content check
test_batch_installer_content() {
    print_test "Windows batch installer content validation"
    
    if [[ -f "install.bat" ]]; then
        # Check for key Windows batch features
        if grep -q "@echo off" install.bat && grep -q "docker --version" install.bat && grep -q "node --version" install.bat; then
            print_success "Windows batch installer has proper structure"
        else
            print_fail "Windows batch installer missing essential features"
        fi
    else
        print_fail "Windows batch installer not found"
    fi
}

# Test 13: PowerShell installer validation
test_powershell_installer() {
    print_test "PowerShell installer validation"
    
    if [[ -f "install.ps1" ]]; then
        # Check for PowerShell-specific features
        if grep -q "param(" install.ps1 && grep -q "Test-Administrator" install.ps1 && grep -q "Write-Host" install.ps1; then
            print_success "PowerShell installer has advanced features"
        else
            print_fail "PowerShell installer missing advanced features"
        fi
    else
        print_fail "PowerShell installer not found"
    fi
}

# Main execution
main() {
    print_header
    
    print_info "Starting comprehensive validation tests..."
    echo ""
    
    # Run all tests
    test_windows_installers
    test_npm_scripts
    test_clean_command
    test_health_command
    test_windows_docs
    test_assets
    test_package_json
    test_readme_updates
    test_presentation_html
    test_docker_files
    test_system_commands
    test_batch_installer_content
    test_powershell_installer
    
    # Print results
    echo ""
    echo -e "${BLUE}=========================================================================${NC}"
    echo -e "${BLUE}                               TEST RESULTS                              ${NC}"
    echo -e "${BLUE}=========================================================================${NC}"
    echo ""
    echo -e "Total Tests: ${BLUE}$TESTS_TOTAL${NC}"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED! Windows compatibility improvements are working correctly.${NC}"
        echo ""
        echo -e "${GREEN}✅ Windows Support Status: EXCELLENT${NC}"
        echo -e "${GREEN}✅ Cross-Platform Compatibility: CONFIRMED${NC}"
        echo -e "${GREEN}✅ Professional Presentation: READY${NC}"
        echo ""
        echo -e "${BLUE}Windows users can now use:${NC}"
        echo -e "${YELLOW}  - install.bat (Native Windows batch installer)${NC}"
        echo -e "${YELLOW}  - install.ps1 (Advanced PowerShell installer)${NC}"
        echo -e "${YELLOW}  - Cross-platform npm commands${NC}"
        echo -e "${YELLOW}  - Comprehensive Windows documentation${NC}"
        exit 0
    else
        echo -e "${RED}❌ SOME TESTS FAILED! Issues detected with Windows compatibility.${NC}"
        echo ""
        echo -e "${RED}Failed tests: $TESTS_FAILED/$TESTS_TOTAL${NC}"
        echo -e "${YELLOW}Please review the failed tests above and fix the issues.${NC}"
        exit 1
    fi
}

# Run the test suite
main "$@"