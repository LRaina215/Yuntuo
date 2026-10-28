"""Pack this project's binary STL meshes and URDF assembly for the offline viewer."""
from pathlib import Path
import argparse,base64,gzip,json,struct,xml.etree.ElementTree as ET
import numpy as np

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--urdf',type=Path,required=True)
parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'assets/robot-model.json')
args=parser.parse_args()
root=ET.parse(args.urdf).getroot()
car_root=args.urdf.resolve().parent.parent
joints={j.find('child').attrib['link']:j for j in root.findall('joint')}
def vec(s):return [float(x) for x in s.split()]
parts=[]
for link in root.findall('link'):
    name=link.attrib['name']
    visual=link.find('visual')
    if visual is None:raise ValueError('Missing visual: '+name)
    origin=visual.find('origin')
    if origin is not None and any(vec(origin.get('xyz','0 0 0'))+vec(origin.get('rpy','0 0 0'))):
        raise ValueError('Apply nonzero visual origins before packing: '+name)
    mesh=visual.find('geometry/mesh')
    if mesh.get('scale','1 1 1')!='1 1 1':raise ValueError('Apply mesh scale before packing: '+name)
    filename=mesh.attrib['filename'].replace('\\','/').split('/')[-1]
    payload=(car_root/'meshes'/filename).read_bytes()
    n=struct.unpack_from('<I',payload,80)[0]
    if len(payload)!=84+n*50:raise ValueError('Expected binary STL: '+filename)
    dtype=np.dtype([('normal','<f4',(3,)),('v','<f4',(3,3)),('attribute','<u2')])
    triangles=np.frombuffer(payload,dtype=dtype,offset=84,count=n)['v'].reshape(-1,3)
    lo=triangles.min(0);extent=np.maximum(triangles.max(0)-lo,1e-9)
    q=np.rint((triangles-lo)/extent*65535).astype('<u2')
    vertices,indices=np.unique(q,axis=0,return_inverse=True)
    raw=vertices.astype('<u2').tobytes()+indices.astype('<u4').tobytes()
    part={'name':name,'vertices':len(vertices),'triangles':n,'min':lo.tolist(),'size':extent.tolist(),'data':base64.b64encode(gzip.compress(raw,compresslevel=9,mtime=0)).decode(),'parent':None,'origin':[0,0,0],'rpy':[0,0,0]}
    j=joints.get(name)
    if j is not None:
        o=j.find('origin')
        part.update(parent=j.find('parent').attrib['link'],origin=vec(o.get('xyz','0 0 0')),rpy=vec(o.get('rpy','0 0 0')),joint=j.attrib['name'],axis=vec(j.find('axis').attrib['xyz']))
    parts.append(part)
    print(name,':',n,'triangles,',len(vertices),'vertices')
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(json.dumps({'name':root.attrib['name'],'source':'Structure/car/car/urdf/car.urdf','format':'uint16 xyz + uint32 triangle indices; gzip/base64','parts':parts},separators=(',',':')),encoding='utf-8')
print('Wrote',args.output)
