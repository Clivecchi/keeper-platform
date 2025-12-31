const fs=require('fs');
const r=JSON.parse(fs.readFileSync('.reports/eslint-web-after.json','utf8'));
const byRule={};
for(const f of r){
  for(const m of f.messages||[]){
    if(m.severity===2){
      byRule[m.ruleId]=(byRule[m.ruleId]||0)+1;
    }
  }
}
console.log('RULE_COUNTS',Object.entries(byRule).sort((a,b)=>b[1]-a[1]).slice(0,10));
