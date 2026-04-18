import fs from 'fs';
const content = fs.readFileSync('d:\\aplicaciones-ia\\ftpro\\public\\app.js', 'utf8');

let open = 0;
let line = 1;
for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') open++;
    if (content[i] === '}') open--;
    if (content[i] === '\n') line++;

    if (open < 0) {
        console.log(`Unbalanced closing brace at line ${line}`);
        open = 0;
    }
}
console.log(`Final open braces: ${open}`);
