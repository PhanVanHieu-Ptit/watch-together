import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const base=process.env.BASE_URL||'http://127.0.0.1:31402';
const result={scope:'Public login form geometry and typography. This is not full-site or pixel equivalence.',viewports:[]};
await mkdir('artifacts/reference',{recursive:true});
try{
 for(const [width,height]of[[1440,900],[390,844]]){
  const measurements={};
  for(const [name,url,root]of[['reference','https://choigivui.com/','.immersive-auth'],['local',base,'.reference-entry']]){
   const context=await browser.newContext({viewport:{width,height}});const page=await context.newPage();await page.goto(url);await page.locator(root).waitFor();await page.evaluate(()=>document.fonts.ready);
   measurements[name]=await page.locator(root).evaluate(el=>{
    const measure=node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return{x:r.x,y:r.y,width:r.width,height:r.height,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight};};
    return{card:measure(el),heading:measure(el.querySelector('h2')),username:measure(el.querySelector('input[name=username]')),password:measure(el.querySelector('input[name=password]')),submit:measure(el.querySelector('form button.primary'))};
   });
   await page.screenshot({path:`artifacts/reference/${name}-${width===1440?'desktop':'mobile'}.png`});await context.close();
  }
  const differences={};let maxDelta=0;
  for(const key of Object.keys(measurements.reference)){const a=measurements.reference[key],b=measurements.local[key];differences[key]={};for(const dimension of['x','y','width','height']){const delta=Math.abs(a[dimension]-b[dimension]);differences[key][dimension]=delta;maxDelta=Math.max(maxDelta,delta);}differences[key].typographyMatches=['fontSize','fontWeight','lineHeight'].every(prop=>a[prop]===b[prop]);}
  result.viewports.push({width,height,measurements,differences,maxGeometryDeltaPx:maxDelta});
 }
}finally{await browser.close();await writeFile('artifacts/reference/entry-comparison.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result.viewports.map(({width,height,maxGeometryDeltaPx,differences})=>({width,height,maxGeometryDeltaPx,differences})),null,2));}
