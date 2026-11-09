import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { supabase } from '../lib/supabase'

type Category = 'top' | 'bottom' | 'shoes' | 'outerwear' | 'accessory'
type WardrobeItem = { id:string; name:string; category_group:Category|null; category:string; original_image_path:string|null; imageUrl?:string }
const categories:{id:Category;label:string}[]=[{id:'top',label:'Tops'},{id:'bottom',label:'Bottoms'},{id:'shoes',label:'Shoes'},{id:'outerwear',label:'Outerwear'},{id:'accessory',label:'Accessories'}]
const categoryOf=(item:WardrobeItem):Category=>item.category_group??(categories.some(c=>c.id===item.category)?item.category as Category:'accessory')

function AvatarScene({gender,outfit}:{gender:'male'|'female';outfit:Partial<Record<Category,WardrobeItem>>}) {
 const host=useRef<HTMLDivElement>(null), outfitRef=useRef(outfit);outfitRef.current=outfit
 useEffect(()=>{
  const element=host.current;if(!element)return
  const scene=new THREE.Scene();scene.background=new THREE.Color('#171412')
  const camera=new THREE.PerspectiveCamera(32,1,.1,100);camera.position.set(0,1.25,6.8)
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setSize(element.clientWidth,element.clientHeight);element.appendChild(renderer.domElement)
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=4.5;controls.maxDistance=9;controls.target.set(0,1.05,0);controls.minPolarAngle=.55;controls.maxPolarAngle=2.35
  scene.add(new THREE.HemisphereLight(0xffffff,0x5c4740,2.1));const key=new THREE.DirectionalLight(0xffe6d1,2.4);key.position.set(3,5,5);scene.add(key);const rim=new THREE.DirectionalLight(0x9aaccb,1.2);rim.position.set(-4,3,-3);scene.add(rim)
  const avatar=new THREE.Group();scene.add(avatar)
  const skin=new THREE.MeshStandardMaterial({color:gender==='male'?'#bd9277':'#d2a58b',roughness:.82}),base=new THREE.MeshStandardMaterial({color:'#d6d0c8',roughness:.9}),dark=new THREE.MeshStandardMaterial({color:'#28272b',roughness:.9})
  const sphere=(x:number,y:number,z:number,sx:number,sy:number,sz:number,mat:THREE.Material)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,28,20),mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);avatar.add(m)}
  const limb=(a:THREE.Vector3,b:THREE.Vector3,r:number,mat:THREE.Material)=>{const d=new THREE.Vector3().subVectors(b,a),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),18),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());avatar.add(m)}
  sphere(0,2.48,0,.23,.29,.2,skin);sphere(0,2.82,-.01,.12,.07,.13,dark);sphere(0,1.78,0,gender==='male'?.39:.34,.53,.22,base);sphere(0,1.17,0,.3,.25,.19,base)
  limb(new THREE.Vector3(-.43,2.03,0),new THREE.Vector3(-.66,1.25,.02),.105,skin);limb(new THREE.Vector3(.43,2.03,0),new THREE.Vector3(.66,1.25,.02),.105,skin);sphere(-.66,1.19,.02,.11,.14,.11,skin);sphere(.66,1.19,.02,.11,.14,.11,skin)
  limb(new THREE.Vector3(-.16,1.04,0),new THREE.Vector3(-.19,.22,0),.13,skin);limb(new THREE.Vector3(.16,1.04,0),new THREE.Vector3(.19,.22,0),.13,skin);sphere(-.19,.12,.09,.16,.1,.27,dark);sphere(.19,.12,.09,.16,.1,.27,dark)
  // Selected wardrobe photos are attached to the 3D body and rotate with the avatar.
  const garments=new THREE.Group();avatar.add(garments);const loader=new THREE.TextureLoader()
  Object.entries(outfitRef.current).forEach(([key,item])=>{if(!item?.imageUrl)return;const category=key as Category,texture=loader.load(item.imageUrl);texture.colorSpace=THREE.SRGBColorSpace;const bottom=category==='bottom',shoes=category==='shoes';const plane=new THREE.Mesh(new THREE.PlaneGeometry(bottom?.66:shoes?.58:.78,bottom?.9:shoes?.32:.82),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false}));plane.position.set(0,bottom?1.12:shoes?.12:1.83,bottom?.225:shoes?.31:.235);if(category==='outerwear')plane.scale.set(1.1,1.08,1);garments.add(plane)})
  const floor=new THREE.Mesh(new THREE.CircleGeometry(1.5,64),new THREE.MeshBasicMaterial({color:'#25201d'}));floor.rotation.x=-Math.PI/2;floor.position.y=-.01;scene.add(floor)
  let frame=0;const render=()=>{frame=requestAnimationFrame(render);controls.update();renderer.render(scene,camera)};render()
  const resize=()=>{if(!host.current)return;camera.aspect=host.current.clientWidth/host.current.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.current.clientWidth,host.current.clientHeight)};const observer=new ResizeObserver(resize);observer.observe(element)
  return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.dispose();element.removeChild(renderer.domElement);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose()}})}
 },[gender,outfit])
 return <div className="tryon-canvas" ref={host} aria-label="Rotatable 3D outfit preview"/>
}

export default function TryMe({userId,gender,onGenderChange}:{userId:string;gender:'male'|'female';onGenderChange:(g:'male'|'female')=>void}) {
 const [items,setItems]=useState<WardrobeItem[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[picker,setPicker]=useState<Category|null>(null),[outfit,setOutfit]=useState<Partial<Record<Category,WardrobeItem>>>({}),[selected,setSelected]=useState<Category>('top')
 useEffect(()=>{let live=true;async function load(){if(!supabase){setError('Wardrobe connection is unavailable.');setLoading(false);return}const {data,error:e}=await supabase.from('wardrobe_items').select('id,name,category,category_group,original_image_path').eq('user_id',userId).order('created_at',{ascending:false});if(e){if(live)setError(e.message);setLoading(false);return}const rows=await Promise.all((data??[]).map(async item=>{if(!item.original_image_path)return item as WardrobeItem;const {data:signed}=await supabase!.storage.from('wardrobe-images').createSignedUrl(item.original_image_path,3600);return {...item,imageUrl:signed?.signedUrl} as WardrobeItem}));if(live)setItems(rows);setLoading(false)}void load();return()=>{live=false}},[userId])
 const available=useMemo(()=>items.filter(item=>categoryOf(item)===selected),[items,selected])
 const choose=(item:WardrobeItem)=>{setOutfit(current=>({...current,[selected]:item}));setPicker(null)}
 const clear=(category:Category)=>setOutfit(current=>{const next={...current};delete next[category];return next})
 return <section className="tryme-page"><div className="tryme-intro"><div><p className="eyebrow">VIRTUAL FITTING ROOM</p><h1>Try your clothes on.</h1><p className="subtitle">Choose pieces from your own wardrobe and build a look on your 3D model.</p></div><div className="gender-tabs"><button className={gender==='male'?'selected':''} onClick={()=>onGenderChange('male')}>MALE</button><button className={gender==='female'?'selected':''} onClick={()=>onGenderChange('female')}>FEMALE</button></div></div>
 <div className="tryme-layout"><div className="tryme-viewer"><div className="tryme-viewer-top"><span>3D FITTING MODEL</span><span>DRAG TO ROTATE · SCROLL TO ZOOM</span></div><AvatarScene gender={gender} outfit={outfit}/><div className="tryme-viewer-foot">YOUR MODEL · INTERACTIVE 360° VIEW</div></div>
 <aside className="tryme-wardrobe"><div className="tryme-wardrobe-head"><div><p className="eyebrow">YOUR WARDROBE</p><h2>Build your outfit</h2></div><span>{items.length} ITEMS</span></div>
 <div className="tryme-category-tabs">{categories.map(c=><button key={c.id} className={selected===c.id?'selected':''} onClick={()=>setSelected(c.id)}>{c.label}</button>)}</div>
 <div className="tryme-current"><p className="eyebrow">ON YOUR MODEL</p>{categories.map(c=><div className="tryme-current-row" key={c.id}><span>{c.label}</span>{outfit[c.id]?<><strong>{outfit[c.id]!.name}</strong><button onClick={()=>clear(c.id)} aria-label={'Remove '+c.label}>×</button></>:<em>Not selected</em>}</div>)}</div>
 <button className="primary-button tryme-add-button" onClick={()=>setPicker(selected)}>＋ CHOOSE {categories.find(c=>c.id===selected)?.label.toUpperCase()}</button>
 {loading&&<p className="tryme-note">Loading your private wardrobe…</p>}{error&&<p className="wardrobe-message">{error}</p>}
 {!loading&&items.length===0&&<div className="tryme-empty"><p>Your wardrobe is empty.</p><small>Add clothing photos in My Closet first, then come back here to try them on.</small></div>}
 <p className="tryme-note">Selections update the 3D preview. Rotate the model to view your outfit from different angles.</p></aside></div>
 {picker&&<div className="tryme-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPicker(null)}}><div className="tryme-modal" role="dialog" aria-modal="true" aria-label="Choose wardrobe item"><div className="tryme-modal-head"><div><p className="eyebrow">SELECT FROM YOUR CLOSET</p><h2>Choose {categories.find(c=>c.id===picker)?.label.toLowerCase()}</h2></div><button onClick={()=>setPicker(null)} aria-label="Close">×</button></div>
 {available.length?<div className="tryme-item-grid">{available.map(item=><button key={item.id} className="tryme-item" onClick={()=>choose(item)}><div className="tryme-item-image">{item.imageUrl?<img src={item.imageUrl} alt={item.name}/>:<span>NO IMAGE</span>}</div><strong>{item.name}</strong></button>)}</div>:<div className="tryme-empty"><p>No {categories.find(c=>c.id===picker)?.label.toLowerCase()} found.</p><small>Add an item to this category in My Closet, then select it here.</small></div>}</div></div>}
 </section>
}
