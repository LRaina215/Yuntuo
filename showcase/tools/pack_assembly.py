"""Pack the latest assembled car, retaining hardware colors and acrylic opacity."""
from pathlib import Path
import argparse,base64,gzip,json
import numpy as np

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--assembly',type=Path,required=True,help='Assembly export directory')
p.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'assets/robot-model.json')
a=p.parse_args()
geometry=json.loads(gzip.decompress((a.assembly/'preview/geometry.json.gz').read_bytes()))
layout=json.loads((a.assembly/'assembly_layout.json').read_text(encoding='utf-8'))
groups={}
for part in geometry:
 key='FPGA_acrylic' if part['group']=='FPGA_with_acrylic' and part['opacity']<1 else part['group']
 # In the source car export the radar cases/connector were merged into base.
 if part['name'] in ['front_sensor_58','front_sensor_59','front_sensor_60']:key='XT_M60'
 groups.setdefault(key,[]).append(part)
if layout['placements']['FPGA_with_acrylic']['model']!='ACX750_with_acrylic':raise ValueError('Expected FPGA with acrylic')
if layout['placements']['Astra_Pro_Plus']['model']!='Astra_Pro_Plus_head_only':raise ValueError('Expected camera without stand')
parts=[]
for name,items in groups.items():
 vertices=[];indices=[];colors=[];offset=0
 for item in items:
  v=np.asarray(item['vertices'],dtype=np.float64)/1000
  vertices.append(v);indices.append(np.asarray(item['triangles'],dtype='<u4')+offset)
  colors.append(np.tile(np.rint(np.asarray(item['color'])*255).astype('u1'),(len(v),1)));offset+=len(v)
 v=np.concatenate(vertices);faces=np.concatenate(indices);rgb=np.concatenate(colors)
 lo=v.min(0);extent=np.maximum(v.max(0)-lo,1e-9);q=np.rint((v-lo)/extent*65535).astype('<u2')
 raw=q.tobytes()+faces.astype('<u4').tobytes()+rgb.tobytes()
 group='FPGA_with_acrylic' if name=='FPGA_acrylic' else name
 parts.append({'name':name,'component':group,'vertices':len(v),'triangles':len(faces),'min':lo.tolist(),'size':extent.tolist(),'vertexColors':True,'opacity':.2 if name=='FPGA_acrylic' else 1,'data':base64.b64encode(gzip.compress(raw,9,mtime=0)).decode(),'parent':None,'origin':[0,0,0],'rpy':[0,0,0],'sourceBodies':len(items)})
 print(name,len(faces),'triangles',len(items),'source bodies')
data={'name':'YunTuo full assembly','source':'Structure/fpga-main/fpga-main/car/urdf/all1.urdf','assembly':'Structure/'+a.assembly.name,'format':'uint16 xyz + uint32 triangle indices + uint8 sRGB vertex colors; gzip/base64','componentCount':len(set(p['component'] for p in parts)),'jointCount':len(layout['groups'])-1,'equipment':{'fpga':'ACX750_with_acrylic','rk':'RK3588_Qichuan_G6_preview','camera':'Astra_Pro_Plus_head_only','cameraHasBase':False,'lidar':'XT-M60','servo':'SG90','ultrasonic':'YB-MVU04','sideCamera':'OV5640','display':'5 inch capacitive TFT 800x480'},'parts':parts}
a.output.write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
print('Wrote',a.output,a.output.stat().st_size,'bytes')
