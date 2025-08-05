#!/bin/bash

# A.A.I.T.I Scripts Validation Test
# This script validates that all enhanced scripts are properly configured

# set -e  # Disabled to allow test failures to be captured

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧪 A.A.I.T.I Scripts Validation Test"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass_count=0
fail_count=0

test_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((pass_count++))
}

test_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((fail_count++))
}

test_warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
}

# Test 1: Directory structure
echo "Testing directory structure..."
if [ -d "$PROJECT_ROOT/scripts/linux" ] && [ -d "$PROJECT_ROOT/scripts/macos" ] && [ -d "$PROJECT_ROOT/scripts/windows" ] && [ -d "$PROJECT_ROOT/scripts/common" ]; then
    test_pass "All script directories exist"
else
    test_fail "Missing script directories"
fi

# Test 2: Script files exist
echo ""
echo "Testing script files..."

scripts=(
    "scripts/linux/demo-verbose.sh"
    "scripts/macos/demo-verbose.sh"
    "scripts/windows/demo-verbose.bat"
    "scripts/common/utils.sh"
    "scripts/linux/install.sh"
    "scripts/macos/install.sh"
    "scripts/windows/install.bat"
    "scripts/windows/install.ps1"
)

for script in "${scripts[@]}"; do
    if [ -f "$PROJECT_ROOT/$script" ]; then
        test_pass "$script exists"
    else
        test_fail "$script missing"
    fi
done

# Test 3: Script permissions (Unix scripts)
echo ""
echo "Testing script permissions..."

unix_scripts=(
    "scripts/linux/demo-verbose.sh"
    "scripts/macos/demo-verbose.sh"
    "scripts/common/utils.sh"
    "scripts/linux/install.sh"
    "scripts/macos/install.sh"
)

for script in "${unix_scripts[@]}"; do
    if [ -x "$PROJECT_ROOT/$script" ]; then
        test_pass "$script is executable"
    else
        test_fail "$script is not executable"
    fi
done

# Test 4: Script content validation
echo ""
echo "Testing script content..."

# Check if Linux demo script has the verbose features
if grep -q '"1" "8"' "$PROJECT_ROOT/scripts/linux/demo-verbose.sh" && \
   grep -q "print_step" "$PROJECT_ROOT/scripts/linux/demo-verbose.sh" && \
   grep -q "Checking System Requirements" "$PROJECT_ROOT/scripts/linux/demo-verbose.sh"; then
    test_pass "Linux demo script has verbose features"
else
    test_fail "Linux demo script missing verbose features"
fi

# Check if Windows demo script has proper structure
if grep -q "Verbose Demo Script for Windows" "$PROJECT_ROOT/scripts/windows/demo-verbose.bat" && \
   grep -q "8/" "$PROJECT_ROOT/scripts/windows/demo-verbose.bat"; then
    test_pass "Windows demo script has verbose features"
else
    test_fail "Windows demo script missing verbose features"
fi

# Test 5: Root demo scripts compatibility
echo ""
echo "Testing root demo script compatibility..."

if grep -q "Enhanced verbose demo script available" "$PROJECT_ROOT/demo.sh" && \
   grep -q "scripts/linux/demo-verbose.sh" "$PROJECT_ROOT/demo.sh"; then
    test_pass "Linux root demo script has compatibility layer"
else
    test_fail "Linux root demo script missing compatibility layer"
fi

if grep -q "Enhanced verbose demo script available" "$PROJECT_ROOT/demo.bat" && \
   grep -q "verbose.bat" "$PROJECT_ROOT/demo.bat"; then
    test_pass "Windows root demo script has compatibility layer"
else
    test_fail "Windows root demo script missing compatibility layer"
fi

# Test 6: Documentation updates
echo ""
echo "Testing documentation updates..."

if grep -q "scripts/linux" "$PROJECT_ROOT/README.md" && \
   grep -q "Enhanced Verbose Demo" "$PROJECT_ROOT/README.md"; then
    test_pass "README.md updated with new script structure"
else
    test_fail "README.md not properly updated"
fi

if [ -f "$PROJECT_ROOT/scripts/README.md" ] && \
   grep -q "Enhanced verbose demo" "$PROJECT_ROOT/scripts/README.md"; then
    test_pass "Scripts README.md exists and has content"
else
    test_fail "Scripts README.md missing or incomplete"
fi

# Test 7: Utility functions
echo ""
echo "Testing utility functions..."

if grep -q "detect_os" "$PROJECT_ROOT/scripts/common/utils.sh" && \
   grep -q "print_step" "$PROJECT_ROOT/scripts/common/utils.sh" && \
   grep -q "check_docker_installed" "$PROJECT_ROOT/scripts/common/utils.sh"; then
    test_pass "Common utilities have required functions"
else
    test_fail "Common utilities missing required functions"
fi

# Summary
echo ""
echo "======================================"
echo "🎯 Test Summary"
echo "======================================"
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! The enhanced demo scripts are properly configured.${NC}"
    echo ""
    echo "✅ Repository structure is organized by operating system"
    echo "✅ Verbose demo scripts provide detailed progress tracking"
    echo "✅ Backward compatibility is maintained"
    echo "✅ Documentation is updated"
    echo "✅ Script permissions are correct"
    echo ""
    echo "You can now use the enhanced verbose demo scripts:"
    echo "  Linux:   ./scripts/linux/demo-verbose.sh"
    echo "  macOS:   ./scripts/macos/demo-verbose.sh" 
    echo "  Windows: scripts\\windows\\demo-verbose.bat"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the issues above.${NC}"
    exit 1
fi