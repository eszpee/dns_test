#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: {
        light: '\x1b[91m',
        medium: '\x1b[31m',
        dark: '\x1b[31;2m'
    },
    green: {
        light: '\x1b[92m',
        medium: '\x1b[32m',
        dark: '\x1b[32;2m'
    },
    yellow: '\x1b[33m'
};

function parseOverallStats(content) {
    const lines = content.split('\n');
    const stats = {};
    let inOverallSection = false;

    for (const line of lines) {
        if (line.includes('Overall Statistics:')) {
            inOverallSection = true;
            continue;
        }

        if (inOverallSection) {
            if (line.trim() === '' && Object.keys(stats).length > 0) {
                break;
            }

            const match = line.match(/^\s*([^:]+):\s*(.+)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim();
                stats[key] = value;
            }
        }
    }

    return stats;
}

function getDnsServerFromFilename(filename) {
    const match = filename.match(/dns_summary_(.+)\.txt$/);
    return match ? match[1] : filename;
}

function parseNumericValue(value) {
    if (typeof value === 'string') {
        if (value.includes('%')) {
            return parseFloat(value.replace('%', ''));
        }
        if (value.includes('sec')) {
            return parseFloat(value.replace(' sec', ''));
        }
        return parseFloat(value) || 0;
    }
    return value;
}

function getColorForValue(metric, value, allValues) {
    if (value === 'N/A' || allValues.length <= 1) return colors.reset;

    const numericValues = allValues.map(v => parseNumericValue(v)).filter(v => !isNaN(v));
    if (numericValues.length === 0) return colors.reset;

    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const current = parseNumericValue(value);

    if (min === max) return colors.reset;

    const range = max - min;
    const position = (current - min) / range;

    const isBetterLow = metric.toLowerCase().includes('response time') ||
                       metric.toLowerCase().includes('percentile');
    const isBetterHigh = metric.toLowerCase().includes('success rate') ||
                        metric.toLowerCase().includes('domains tested');

    if (isBetterLow) {
        if (position <= 0.33) return colors.green.medium;
        if (position <= 0.66) return colors.yellow;
        return colors.red.medium;
    } else if (isBetterHigh) {
        if (position >= 0.66) return colors.green.medium;
        if (position >= 0.33) return colors.yellow;
        return colors.red.medium;
    }

    return colors.reset;
}

function createAsciiTable(data) {
    const rows = Object.keys(data.stats);
    const servers = data.servers;

    const colWidths = {};
    colWidths['Metric'] = Math.max(6, Math.max(...rows.map(r => r.length)));

    servers.forEach(server => {
        const maxValueLength = Math.max(...rows.map(row =>
            (data.stats[row][server] || 'N/A').toString().length
        ));
        colWidths[server] = Math.max(server.length, maxValueLength);
    });

    let table = '';

    const headerRow = '| ' +
        colors.bright + 'Metric'.padEnd(colWidths['Metric']) + colors.reset + ' | ' +
        servers.map(server => colors.bright + server.padEnd(colWidths[server]) + colors.reset).join(' | ') +
        ' |';

    const separator = '|' +
        '-'.repeat(colWidths['Metric'] + 2) + '|' +
        servers.map(server => '-'.repeat(colWidths[server] + 2)).join('|') +
        '|';

    table += headerRow + '\n';
    table += separator + '\n';

    rows.forEach(row => {
        const allValuesForMetric = servers.map(server => data.stats[row][server] || 'N/A');

        const dataRow = '| ' +
            row.padEnd(colWidths['Metric']) + ' | ' +
            servers.map(server => {
                const value = data.stats[row][server] || 'N/A';
                const color = getColorForValue(row, value, allValuesForMetric);
                const paddedValue = value.toString().padEnd(colWidths[server]);
                return color + paddedValue + colors.reset;
            }).join(' | ') +
            ' |';
        table += dataRow + '\n';
    });

    return table;
}

function createCsv(data) {
    const rows = Object.keys(data.stats);
    const servers = data.servers;

    let csv = 'Metric,' + servers.join(',') + '\n';

    rows.forEach(row => {
        const values = servers.map(server => {
            const value = data.stats[row][server] || 'N/A';
            return `"${value}"`;
        });
        csv += `"${row}",${values.join(',')}\n`;
    });

    return csv;
}

function main() {
    try {
        const files = fs.readdirSync('.')
            .filter(file => file.match(/^dns_summary_.*\.txt$/))
            .sort();

        if (files.length === 0) {
            console.log('No DNS summary files found in current directory.');
            return;
        }

        console.log(`Found ${files.length} DNS summary files:`);
        files.forEach(file => console.log(`  ${file}`));
        console.log();

        const data = {
            servers: [],
            stats: {}
        };

        files.forEach(file => {
            const server = getDnsServerFromFilename(file);
            data.servers.push(server);

            const content = fs.readFileSync(file, 'utf8');
            const stats = parseOverallStats(content);

            Object.keys(stats).forEach(key => {
                if (!data.stats[key]) {
                    data.stats[key] = {};
                }
                data.stats[key][server] = stats[key];
            });
        });

        const asciiTable = createAsciiTable(data);
        console.log('DNS Performance Comparison:');
        console.log(asciiTable);

        const csv = createCsv(data);
        fs.writeFileSync('dns_comparison.csv', csv);
        console.log('Results exported to dns_comparison.csv');

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { parseOverallStats, getDnsServerFromFilename, createAsciiTable, createCsv };