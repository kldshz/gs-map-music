import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
// Separate test records ensure checks never alter the user's visual edits.
await fs.mkdir('.local/dev-browser-tests',{recursive:true});
await fs.writeFile('.local/dev-browser-tests/association-edits.json',JSON.stringify({schemaVersion:1,edits:[]}));
const child=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5193'],{stdio:'inherit',windowsHide:true,env:{...process.env,GS_MUSIC_TEST_EDITS:'.local/dev-browser-tests/association-edits.json'}});
child.on('exit',code=>process.exit(code??1));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{child.kill(signal);process.exit(0);});
