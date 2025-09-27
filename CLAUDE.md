# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a DNS performance testing suite for macOS that benchmarks DNS server performance across different domain categories. The tool measures response times, success rates, and generates comprehensive statistics.

## Architecture

- **Main script**: `dns_test.js` - Node.js CLI tool that orchestrates the entire testing process
- **Test configuration**: `test_suite.yaml` - YAML configuration defining domain groups to test
- **Output files**:
  - `dns_results.csv` - Raw test results in CSV format
  - `dns_summary.txt` - Aggregated statistics and summary report

## Key Dependencies

- `js-yaml`: For parsing the YAML test configuration
- `dig`: System command for DNS lookups (requires macOS)
- `networksetup`: macOS system command for DNS configuration
- `dscacheutil`: macOS system command for DNS cache management

## Core Workflow

1. **DNS Configuration Management**: Captures current DNS settings, temporarily changes to test server, then restores original settings
2. **Test Execution**: Runs DNS queries using `dig` command against domains grouped by category
3. **Performance Measurement**: Uses high-resolution timing (`process.hrtime()`) to measure response times
4. **Results Processing**: Generates both raw CSV data and statistical summaries

## Development Commands

```bash
# Run the DNS test suite
npm test                    # Equivalent to: node dns_test.js
./dns_test.js <dns_server>  # Direct execution with DNS server IP

# Install dependencies
npm install

# Make script executable
chmod +x dns_test.js
```

## System Requirements

- macOS (uses macOS-specific networking commands)
- Administrative privileges (sudo access required)
- Node.js runtime

## Test Configuration

The `test_suite.yaml` file defines test groups with different domain categories:
- `international`: International news/media sites
- `hungarian`: Hungarian-specific domains
- `local`: Local network hostnames
- `us`: US-based websites
- `invalid`: Non-existent domains for failure testing

## macOS-Specific Features

The tool is tightly integrated with macOS networking:
- Uses `networksetup` to change DNS servers temporarily
- Clears DNS cache via `dscacheutil` and `mDNSResponder`
- Automatically detects primary network interface
- Safely restores original DNS configuration on completion or error