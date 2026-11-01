from pathlib import Path
import re,zipfile,hashlib,json,subprocess,tempfile
R=Path(__file__).resolve().parent
with zipfile.ZipFile(R.parent/'upload/JACK22-LOT8.9-VALIDE-ACCUEIL-ORIGINAL.zip') as z:f={i.filename.replace('\\','/'):z.read(i) for i in z.infolist()}
s=f['JACK22-STUDIO-LOT8.9.html'].decode('utf-8-sig')
patches={
 '...p.clips); audioLevel = p.level;':'...p.clips.map(c=>({...c,voice:c.voice?JSON.parse(JSON.stringify(c.voice)):null}))); audioLevel = p.level;',
 'take = p.take; drawTake();':'take = p.take ? JSON.parse(JSON.stringify(p.take)) : null; drawTake();',

 'const TL_BAR_W = 56, TL_LABEL_W = 208, SONG_TAIL = 1.5;':'let TL_BAR_W = 56; const TL_LABEL_W = 208, SONG_TAIL = 1.5;',
 'p.clips=p.clips.map(c=>({...c,voice:c.voice?copy(c.voice):null}));':'p.clips=p.clips.map(c=>({...c,voice:c.voice?copy(c.voice):null}));',
 'if(undo.length>12)undo.shift();':'if(undo.length>24)undo.shift();pruneHistory();',
 '12 états maximum, dans cette session':'24 états maximum, plafonnés en mémoire, dans cette session',
 "if(persistBusy||window.Jack22Voice.state.active||window.Jack22Lot3.pending)return;\n if(commitTimer)":"if(persistBusy||exporting||state!=='stopped'||rec.state!=='idle'||window.Jack22Voice.state.active||window.Jack22Lot3.pending)return;\n if(commitTimer)",
 'get state(){return copy(state8)},remember};':'get state(){return copy(state8)},remember,travel};'
}
for a,b in patches.items():assert s.count(a)==1,a;s=s.replace(a,b)
# Snapshot clips were shallowly referenced before voice cloning; metadata now has its own copies already.
# Memory limit counts unique decoded buffers retained by history; oldest snapshots are discarded.
needle='function remember(){if(restore'
insert='''function pruneHistory(){const live=new Set(audioClips.map(c=>c.buffer).filter(Boolean));function extra(){const seen=new Set(live);let bytes=0;for(const p of [...undo,...redo])for(const c of p.clips){if(c.buffer&&!seen.has(c.buffer)){seen.add(c.buffer);bytes+=c.buffer.length*c.buffer.numberOfChannels*4;}}return bytes;}while(undo.length&&extra()>256*1048576)undo.shift();while(redo.length&&extra()>256*1048576)redo.shift();}
'''
s=s.replace(needle,insert+needle)
css='''<style id="j90Styles">
#j90Dialog{width:min(680px,90vw);max-height:85dvh;overflow:auto;background:#222526;color:#e9e9df;border:1px solid #636369;border-radius:10px;padding:18px;box-shadow:0 15px 65px #000b}#j90Dialog::backdrop{background:#0009}#j90Dialog header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:15px}#j90Dialog label{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:12px 0}#j90Dialog input{max-width:65%;color:#eee;background:#151819;border:1px solid #64676a;border-radius:5px;padding:7px}#j90Dialog p{font-size:12px;line-height:1.6}#j90Dialog button{color:#eee;background:#303335;border:1px solid #575c60;border-radius:5px;padding:7px 10px;cursor:pointer}.j90LibraryRow{display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid #444}.j90LibraryRow span{flex:1;overflow-wrap:anywhere}#j90Zoom{display:inline-flex;gap:3px;align-items:center}#j90ZoomValue{font-size:10px;min-width:36px;text-align:center}#timeline .tl-lane{background-image:repeating-linear-gradient(90deg,transparent 0 calc(var(--bw) - 1px),#7185702d calc(var(--bw) - 1px) var(--bw))!important}
@media(max-width:600px){.j90LibraryRow{flex-wrap:wrap}.j90LibraryRow span{flex-basis:100%}}
</style>'''
s=s.replace('<title>','<title>9.0 CANDIDATE · ',1)
s=s.replace('</head>',css+'</head>');s=s.replace('</body>','<script id="j90Module">'+(R/'extension.js').read_text()+'</script></body>')
(R/'JACK22-STUDIO-9.0-CANDIDATE.html').write_text(s)
f.pop('JACK22-STUDIO-LOT8.9.html');f['JACK22-STUDIO-9.0-CANDIDATE.html']=s.encode()
f['web/index.html']=s.replace('</head>','<link rel="manifest" href="./manifest.webmanifest"><meta name="theme-color" content="#202429"><link rel="icon" href="./icon-192.png"></head>').encode()
f['web/sw.js']=re.sub(r"(const CACHE = PREFIX \+ ')[^']+",r'\g<1>'+hashlib.sha256(f['web/index.html']).hexdigest()[:16],f['web/sw.js'].decode()).encode()
for k in ['ouvrir-JACK22.cmd','ouvrir-dans-Edge.cmd']:f[k]=f[k].replace(b'JACK22-STUDIO-LOT8.9.html',b'JACK22-STUDIO-9.0-CANDIDATE.html')
for k in list(f):
 if k.endswith(('.md','.json')) and k not in ['SHA256.json']:f['historique/'+k]=f.pop(k)
f['LIRE-MOI.txt']='JACK22 9.0 — CANDIDATE\nExtraire le ZIP puis ouvrir ouvrir-dans-Edge.cmd.\nUtiliser une copie de projet. La 8.9 validée reste la référence stable.\nInspecter/zoom/annuler dans l’arrangement ; bibliothèque et versions dans Projet.\nLire BILAN-9.0.md avant utilisation.\n'.encode()
report=R/'BILAN-9.0.md'
if report.exists():f['BILAN-9.0.md']=report.read_bytes()
f['sources/extension.js']=(R/'extension.js').read_bytes()
f['SHA256.json']=json.dumps({k:hashlib.sha256(v).hexdigest() for k,v in f.items() if k.endswith(('.html','.js','.png','.webmanifest'))},indent=2).encode()
for i,js in enumerate(re.findall(r'<script\b[^>]*>(.*?)</script>',s,re.S|re.I)):
 with tempfile.NamedTemporaryFile('w',suffix='.js') as t:t.write(js);t.flush();subprocess.run(['node','--check',t.name],check=True,capture_output=True)
with zipfile.ZipFile(R/'JACK22-9.0-CINQ-OUTILS-CANDIDATE.zip','w',zipfile.ZIP_DEFLATED) as z:
 for k,v in f.items():z.writestr(k,v)
print('15 scripts syntax OK; SHA',hashlib.sha256(s.encode()).hexdigest())
