# DNS Performance Test Suite

A tool for benchmarking and comparing DNS server performance across various domain types.

## Features

- Tests DNS resolution performance for various domain types (international, local, invalid, etc.)
- Measures response times and success rates
- Generates comprehensive statistics and reports

## Requirements

- Node.js
- npm

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Make sure the test script is executable: `chmod +x dns_test.js`

## Usage

```bash
# Run the DNS test against a specific DNS server
./dns_test.js 8.8.8.8
```

## Test Configuration

Edit `test_suite.yaml` to customize test domains:

```yaml
test_groups:
  international:
    - lemonde.fr
    - bbc.co.uk
  # Add more groups and domains as needed
```

## Output Files

- `dns_results.csv` - Raw test results in CSV format
- `dns_summary.txt` - Summary statistics for the test run

## Example

```
./dns_test.js 8.8.8.8
Starting DNS tests with server 8.8.8.8
Testing directly against DNS server: 8.8.8.8

Testing group: international
international: [██████████████████████████████] 100% (100/100)


Testing group: hungarian
hungarian: [██████████████████████████████] 100% (100/100)


Testing group: local
local: [██████████████████████████████] 100% (5/5)


Testing group: us
us: [██████████████████████████████] 100% (100/100)


Testing group: invalid
invalid: [██████████████████████████████] 100% (5/5)


Generating summary statistics...
DNS Server: 8.8.8.8
Test Date: 9/27/2025, 12:28:59 PM

Group Statistics:
Group: international
  Domains tested: 100
  Success rate: 99.0%
  Mean response time: 0.059 sec
  Median response time: 0.043 sec
  Min response time: 0.019 sec
  Max response time: 0.361 sec
  95th percentile: 0.169 sec
  99th percentile: 0.317 sec
  Failed domains: sorbonne.fr

Group: hungarian
  Domains tested: 100
  Success rate: 100.0%
  Mean response time: 0.045 sec
  Median response time: 0.042 sec
  Min response time: 0.016 sec
  Max response time: 0.104 sec
  95th percentile: 0.063 sec
  99th percentile: 0.089 sec

Group: local
  Domains tested: 5
  Success rate: 0.0%
  Mean response time: 0.038 sec
  Median response time: 0.039 sec
  Min response time: 0.032 sec
  Max response time: 0.042 sec
  95th percentile: 0.042 sec
  99th percentile: 0.042 sec
  Failed domains: newmedia, openmediavault, selfhost, archiveteam-warrior, immich

Group: us
  Domains tested: 100
  Success rate: 100.0%
  Mean response time: 0.052 sec
  Median response time: 0.041 sec
  Min response time: 0.015 sec
  Max response time: 0.272 sec
  95th percentile: 0.137 sec
  99th percentile: 0.201 sec

Group: invalid
  Domains tested: 5
  Success rate: 100.0%
  Mean response time: 0.120 sec
  Median response time: 0.040 sec
  Min response time: 0.034 sec
  Max response time: 0.445 sec
  95th percentile: 0.365 sec
  99th percentile: 0.429 sec

Overall Statistics:
  Domains tested: 310
  Success rate: 98.1%
  Mean response time: 0.053 sec
  Median response time: 0.042 sec
  Min response time: 0.015 sec
  Max response time: 0.445 sec
  95th percentile: 0.132 sec
  99th percentile: 0.279 sec

All Failed Domains:
  international/sorbonne.fr: FAILED
  local/newmedia: FAILED
  local/openmediavault: FAILED
  local/selfhost: FAILED
  local/archiveteam-warrior: FAILED
  local/immich: FAILED


Testing completed. Results saved to dns_results_8.8.8.8.csv and dns_summary_8.8.8.8.txt
```

## Notes

This tool was tested to run on MacOS, not sure how it would work on other operating systems.
