// Dedicated local QA server: metadata is deterministic; YouTube playback is not simulated.
import {createBackend} from '../server/index.js';
const backend=createBackend({accountsFile:process.env.ACCOUNTS_FILE||'/private/tmp/wetube-reference-qa.json',nextVideoDelayMs:1000,metadata:async id=>({title:'QA video '+id,author:'QA metadata fixture',thumbnail:'https://i.ytimg.com/vi/'+id+'/mqdefault.jpg'})});
backend.http.listen(Number(process.env.PORT||31402),'127.0.0.1',()=>console.log('Reference QA server: http://127.0.0.1:'+(process.env.PORT||31402)));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await backend.close();process.exit(0);});
