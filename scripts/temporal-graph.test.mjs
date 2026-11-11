import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nodesAt, compareSelections, temporalInput, selectHistoryDay, validateHistoryIndex} from '../src/lib/temporal-graph.ts';
const index={basis:'mybr-published',currentCount:2,nodes:[{uid:'know-one',publishedOn:'2026-01-01'},{uid:'know-two',publishedOn:'2026-01-03'}]};
test('node accumulation includes exactly published UIDs, including zero and reverse selections',()=>{
 assert.deepEqual([...nodesAt(index,'2025-12-31')],[]);
 assert.deepEqual([...nodesAt(index,'2026-01-01')],['know-one']);
 assert.deepEqual([...nodesAt(index,'2026-01-03')],['know-one','know-two']);
 assert.deepEqual(compareSelections(new Set(['know-one','know-two']),new Set(['know-one'])),{addedUids:[],removedUids:['know-two']});
});
test('temporal graph removes current relations, taxonomy and growth without mutating the graph',()=>{
 const graph={nodes:[{uid:'know-one',title:'현재 제목',url:'/mybr-ai/notes/one',growth:'engram'}],edges:[{source:'know-one',target:'know-two'}],viewNodes:[{id:'section-knowledge'}],viewLinks:[]};
 const before=JSON.stringify(graph);
 assert.deepEqual(temporalInput(graph,new Set(['know-one','unknown'])),{nodes:[{id:'know-one',label:'현재 제목',url:'/mybr-ai/notes/one',kind:'post'}],links:[]});
 assert.equal(JSON.stringify(graph),before);
});
test('history dates clamp future and recover invalid queries; index rejects dangling records',()=>{
 assert.deepEqual(selectHistoryDay('9999-01-01','2026-11-11'),{day:'2026-11-11',corrected:true});
 assert.deepEqual(selectHistoryDay('bad','2026-11-11'),{day:'2026-11-11',corrected:true});
 assert.equal(selectHistoryDay('0001-01-01','2026-11-11').day,'0001-01-01');
 assert.deepEqual(validateHistoryIndex(index,new Set(['know-one','know-two'])),index);
 assert.throws(()=>validateHistoryIndex(index,new Set(['know-one'])));
 assert.throws(()=>validateHistoryIndex({...index,currentCount:3},new Set(['know-one','know-two'])));
});
