import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackend} from '../server/index.js';
const directory=await mkdtemp(join(tmpdir(),'wetube-ui-'));
const backend=createBackend({accountsFile:join(directory,'accounts.json'),roomsFile:join(directory,'rooms.json'),nextVideoDelayMs:120000,metadata:async id=>({title:'QA video '+id,author:'QA fixture'})});
backend.http.listen(31403,'127.0.0.1',()=>console.log('Engagement QA: http://127.0.0.1:31403 (temporary data; fixture metadata)'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await backend.close();await rm(directory,{recursive:true,force:true});process.exit(0);});
