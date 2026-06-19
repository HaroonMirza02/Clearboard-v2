const fs = require('fs');

const lines = fs.readFileSync('server.js', 'utf-8').split('\n');
const newLines = [];
let inLegacyBlock = false;
const catchAllBlock = [];
let inCatchAll = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("app.all('/api/*'")) {
        inCatchAll = true;
        catchAllBlock.push(line);
        continue;
    }
    
    if (inCatchAll) {
        catchAllBlock.push(line);
        if (line.includes('});')) {
            inCatchAll = false;
        }
        continue;
    }

    if (line.startsWith('// Upload endpoint (streaming, with optional compression)')) {
        newLines.push('// To be reviewed by the supervisor');
        newLines.push('/*');
        inLegacyBlock = true;
    }
    
    if (inLegacyBlock) {
        newLines.push(line);
        const lookback = lines.slice(Math.max(0, i - 5), i + 1).join('\n');
        if (line.trim() === '});' && lookback.includes('Unshare file error')) {
            newLines.push('*/');
            inLegacyBlock = false;
            newLines.push("app.use('/api/files', require('./routes/files'));");
            continue;
        }
        continue;
    }

    if (line.includes('const PORT = process.env.PORT')) {
        newLines.push(...catchAllBlock);
        newLines.push(line);
        continue;
    }

    newLines.push(line);
}

fs.writeFileSync('server.js', newLines.join('\n'), 'utf-8');
console.log('Migration complete');
