import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePathReferences, pathsForNote } from '../src/lib/paths.ts';
const path = { id:'path-sample', title:'검증용', summary:'테스트 fixture', publishedOn:'2026-01-01', steps:[{id:'step-one',title:'시작',description:'확인한 설명',noteUids:['know-one']},{id:'step-two',title:'다음',description:'연결 글이 없는 단계',noteUids:[]}] };
test('paths retain array order and reverse references without creating graph edges',()=>{
 assert.doesNotThrow(()=>validatePathReferences([path],new Set(['know-one'])));
 assert.deepEqual(pathsForNote('know-one',[path]),[path]);
 assert.deepEqual(pathsForNote('missing',[path]),[]);
 assert.deepEqual(path.steps.map(s=>s.id),['step-one','step-two']);
});
test('paths reject invalid dates, duplicate IDs, empty descriptions and dangling or planned notes',()=>{
 for(const paths of [[path,path],[{...path,publishedOn:'2026-02-30'}],[{...path,steps:[]}],[{...path,steps:[path.steps[0],path.steps[0]]}],[{...path,steps:[{...path.steps[0],description:' '}]}],[{...path,steps:[{...path.steps[0],noteUids:['plan-next']}]}],[{...path,steps:[{...path.steps[0],noteUids:['know-one','know-one']}]}]]) assert.throws(()=>validatePathReferences(paths,new Set(['know-one'])));
});
