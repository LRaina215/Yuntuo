"""Tessellate the supplied XT-M60 STEP for the offline product viewer (CadQuery)."""
from pathlib import Path
import argparse,base64,gzip,json
import cadquery as cq
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--step',type=Path,required=True)
parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'assets/lidar-model.json')
a=parser.parse_args();shape=cq.importers.importStep(str(a.step)).val();parts=[]
for i,solid in enumerate(shape.Solids()):
 vv,tt=solid.tessellate(.12,.16)
 positions=[[v.y/1000,-v.x/1000,v.z/1000] for v in vv]
 color=[.38,.43,.46] if i in [0,3] else [.025,.055,.065] if i in [1,2] else [.06,.28,.18] if i==5 else [.10,.12,.13] if i==4 else [.64,.65,.61]
 parts.append({'name':f'XT_M60_{i}','vertices':positions,'triangles':tt,'color':color})
raw=json.dumps(parts,separators=(',',':')).encode()
data={'name':'XT-M60','source':'XT-M60技术资料/XT-M60_3D模型.stp','format':'gzip/base64 JSON mesh; metres; display Y-up','bodies':len(parts),'data':base64.b64encode(gzip.compress(raw,9,mtime=0)).decode()}
a.output.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('XT-M60:',len(parts),'CAD bodies,',sum(len(p['triangles']) for p in parts),'triangles,',a.output.stat().st_size,'bytes')
