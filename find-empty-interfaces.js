const fs=require('fs');
const r=JSON.parse(fs.readFileSync('.reports/eslint-empty-type.json','utf8'));

console.log('Remaining @typescript-eslint/no-empty-object-type violations:');
for(const f of r){
  const violations = (f.messages||[]).filter(m => m.ruleId === '@typescript-eslint/no-empty-object-type');
  if(violations.length > 0){
    console.log(`\n${f.filePath}:`);
    for(const v of violations){
      console.log(`  Line ${v.line}: ${v.message}`);
    }
  }
}
