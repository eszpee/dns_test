#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const yaml = require('js-yaml');
const util = require('util');
const execPromise = util.promisify(exec);

// Check if DNS server IP is provided
if (process.argv.length !== 3) {
  console.log(`Usage: ${process.argv[1]} <dns_server_ip>`);
  process.exit(1);
}

const DNS_SERVER = process.argv[2];
const YAML_FILE = 'test_suite.yaml';
const RESULTS_FILE = `dns_results_${DNS_SERVER}.csv`;
const SUMMARY_FILE = `dns_summary_${DNS_SERVER}.txt`;

// Sleep function to add delay between requests
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Progress bar display with current domain
function displayProgress(current, total, groupName, currentDomain = '') {
  const percentage = Math.round((current / total) * 100);
  const barLength = 30;
  const filledLength = Math.round((current / total) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

  let progressLine = `${groupName}: [${bar}] ${percentage}% (${current}/${total})`;
  let domainLine = currentDomain ? `Testing: ${currentDomain}` : '';

  // Clear previous lines and write new ones
  process.stdout.write('\r\x1b[K'); // Clear current line
  if (domainLine) {
    process.stdout.write('\x1b[1A\x1b[K'); // Move up and clear line above
  }

  process.stdout.write(progressLine);
  if (domainLine) {
    process.stdout.write('\n' + domainLine);
  }
}


// Validate IP address format
function isValidIP(ip) {
  const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipPattern);
  
  if (!match) return false;
  
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10);
    if (octet < 0 || octet > 255) return false;
  }
  
  return true;
}

// Check if test suite YAML exists
if (!fs.existsSync(YAML_FILE)) {
  console.error(`Error: Test suite file ${YAML_FILE} not found`);
  process.exit(1);
}

// Validate DNS server IP
if (!isValidIP(DNS_SERVER)) {
  console.error(`Error: Invalid DNS server IP address: ${DNS_SERVER}`);
  process.exit(1);
}





// Run DNS lookup test and measure time
async function testDomain(domain, group) {
  const startTime = process.hrtime();

  try {
    const { stdout, stderr } = await execPromise(`dig +short +time=2 +tries=1 @${DNS_SERVER} ${domain}`);
    const result = stdout.trim();

    const endTime = process.hrtime(startTime);
    const responseTime = endTime[0] + endTime[1] / 1e9;

    // Check if domain resolved - reverse logic for invalid domains
    let status;
    if (group === 'invalid') {
      // For invalid domains: success if it doesn't resolve, failure if it does
      status = result ? 'FAILED' : 'OK';
    } else {
      // For normal domains: success if it resolves, failure if it doesn't
      status = result ? 'OK' : 'FAILED';
    }

    // Log result to CSV
    fs.appendFileSync(RESULTS_FILE, `${group},${domain},${responseTime.toFixed(6)},${status},"${result}"\n`);

    // Don't display individual results during testing to keep progress bar clean
    // Results will be shown in the summary

    return { domain, responseTime, status, result };
  } catch (error) {
    const endTime = process.hrtime(startTime);
    const responseTime = endTime[0] + endTime[1] / 1e9;

    // For errors, treat as success for invalid domains since they failed to resolve
    const status = group === 'invalid' ? 'OK' : 'ERROR';

    // Log error result
    fs.appendFileSync(RESULTS_FILE, `${group},${domain},${responseTime.toFixed(6)},${status},"${error.message}"\n`);
    // Don't display individual results during testing to keep progress bar clean

    return { domain, responseTime, status, result: error.message };
  }
}

// Run tests for a group
async function testGroup(group, domains) {
  console.log(`\nTesting group: ${group}`);
  console.log(); // Extra line for domain display
  const results = [];

  for (let i = 0; i < domains.length; i++) {
    const domain = domains[i];

    // Show progress with current domain
    displayProgress(i + 1, domains.length, group, domain);

    const result = await testDomain(domain, group);
    results.push(result);

    // Add 100ms delay between requests (except for the last one)
    if (i < domains.length - 1) {
      await sleep(100);
    }
  }

  // Complete the progress bar and clear domain line
  displayProgress(domains.length, domains.length, group);
  process.stdout.write('\r\x1b[K'); // Clear the domain line
  console.log(); // New line after progress bar

  return results;
}

// Calculate statistical percentiles
function calculatePercentile(sortedArray, percentile) {
  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

// Generate summary statistics
function generateSummary(allResults) {
  console.log('\nGenerating summary statistics...');

  let summaryContent = `DNS Server: ${DNS_SERVER}\n`;
  summaryContent += `Test Date: ${new Date().toLocaleString()}\n\n`;
  summaryContent += 'Group Statistics:\n';

  // Calculate statistics by group
  const groups = {};
  const failures = {};
  allResults.forEach(result => {
    if (!groups[result.group]) {
      groups[result.group] = {
        count: 0,
        total: 0,
        min: Infinity,
        max: 0,
        success: 0,
        responseTimes: []
      };
      failures[result.group] = [];
    }

    const group = groups[result.group];
    group.count++;
    group.total += result.responseTime;
    group.min = Math.min(group.min, result.responseTime);
    group.max = Math.max(group.max, result.responseTime);
    group.responseTimes.push(result.responseTime);

    if (result.status === 'OK') {
      group.success++;
    } else {
      failures[result.group].push(result.domain);
    }
  });

  // Add group stats to summary
  for (const [groupName, stats] of Object.entries(groups)) {
    const sortedTimes = stats.responseTimes.sort((a, b) => a - b);
    const median = calculatePercentile(sortedTimes, 50);
    const p95 = calculatePercentile(sortedTimes, 95);
    const p99 = calculatePercentile(sortedTimes, 99);

    summaryContent += `Group: ${groupName}\n`;
    summaryContent += `  Domains tested: ${stats.count}\n`;
    summaryContent += `  Success rate: ${((stats.success / stats.count) * 100).toFixed(1)}%\n`;
    summaryContent += `  Mean response time: ${(stats.total / stats.count).toFixed(3)} sec\n`;
    summaryContent += `  Median response time: ${median.toFixed(3)} sec\n`;
    summaryContent += `  Min response time: ${stats.min.toFixed(3)} sec\n`;
    summaryContent += `  Max response time: ${stats.max.toFixed(3)} sec\n`;
    summaryContent += `  95th percentile: ${p95.toFixed(3)} sec\n`;
    summaryContent += `  99th percentile: ${p99.toFixed(3)} sec\n`;

    // List failures if any
    if (failures[groupName].length > 0) {
      summaryContent += `  Failed domains: ${failures[groupName].join(', ')}\n`;
    }
    summaryContent += '\n';
  }

  // Calculate overall statistics
  const allTimes = allResults.map(r => r.responseTime);
  const sortedAllTimes = allTimes.sort((a, b) => a - b);
  const overallMedian = calculatePercentile(sortedAllTimes, 50);
  const overallP95 = calculatePercentile(sortedAllTimes, 95);
  const overallP99 = calculatePercentile(sortedAllTimes, 99);

  const overall = {
    count: allResults.length,
    total: allResults.reduce((sum, r) => sum + r.responseTime, 0),
    min: Math.min(...allTimes),
    max: Math.max(...allTimes),
    success: allResults.filter(r => r.status === 'OK').length
  };

  // Add overall stats to summary
  summaryContent += 'Overall Statistics:\n';
  summaryContent += `  Domains tested: ${overall.count}\n`;
  summaryContent += `  Success rate: ${((overall.success / overall.count) * 100).toFixed(1)}%\n`;
  summaryContent += `  Mean response time: ${(overall.total / overall.count).toFixed(3)} sec\n`;
  summaryContent += `  Median response time: ${overallMedian.toFixed(3)} sec\n`;
  summaryContent += `  Min response time: ${overall.min.toFixed(3)} sec\n`;
  summaryContent += `  Max response time: ${overall.max.toFixed(3)} sec\n`;
  summaryContent += `  95th percentile: ${overallP95.toFixed(3)} sec\n`;
  summaryContent += `  99th percentile: ${overallP99.toFixed(3)} sec\n`;

  // List all failures
  const allFailures = allResults.filter(r => r.status !== 'OK');
  if (allFailures.length > 0) {
    summaryContent += '\nAll Failed Domains:\n';
    allFailures.forEach(failure => {
      summaryContent += `  ${failure.group}/${failure.domain}: ${failure.status}\n`;
    });
  }

  // Save summary to file
  fs.writeFileSync(SUMMARY_FILE, summaryContent);
  console.log(summaryContent);
}

// Main execution
async function main() {
  console.log(`Starting DNS tests with server ${DNS_SERVER}`);

  try {
    // Load test suite
    const testSuite = yaml.load(fs.readFileSync(YAML_FILE, 'utf8'));

    // Initialize results file
    fs.writeFileSync(RESULTS_FILE, 'group,domain,response_time,status,result\n');

    console.log(`Testing directly against DNS server: ${DNS_SERVER}`);

    // Run tests for each group
    const allResults = [];

    for (const [group, domains] of Object.entries(testSuite.test_groups)) {
      const groupResults = await testGroup(group, domains);

      // Add group name to results
      groupResults.forEach(result => {
        result.group = group;
        allResults.push(result);
      });
    }

    // Generate summary
    generateSummary(allResults);

    console.log(`\nTesting completed. Results saved to ${RESULTS_FILE} and ${SUMMARY_FILE}`);

  } catch (error) {
    console.error('Error running DNS tests:', error.message);


    process.exit(1);
  }
}

main();