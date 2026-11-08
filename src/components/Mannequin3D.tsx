import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Props = { gender: 'male' | 'female' }

export default function Mannequin3D({ gender }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = mountRef.current
    if (!host) return
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#171412')
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(0, 1.45, 7.4)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    host.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight(0xfff4e9, 0x30251f, 2.1))
    const key = new THREE.DirectionalLight(0xffffff, 3.1)
    key.position.set(-3, 6, 5)
    key.castShadow = true
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xd78e79, 1.5)
    rim.position.set(4, 3, -4)
    scene.add(rim)

    const root = new THREE.Group()
    scene.add(root)
    const white = new THREE.MeshStandardMaterial({ color: '#f5f3ef', roughness: 0.82 })
    const seam = new THREE.MeshStandardMaterial({ color: '#dedbd5', roughness: 0.9 })
    const skin = new THREE.MeshStandardMaterial({ color: gender === 'female' ? '#d7a27f' : '#bd8968', roughness: 0.8 })
    const hair = new THREE.MeshStandardMaterial({ color: gender === 'female' ? '#211a17' : '#29211c', roughness: 0.95 })
    const sole = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.65 })
    const dark = new THREE.MeshStandardMaterial({ color: '#49352d', roughness: 0.9 })

    function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x: number, y: number, z: number, sx=1, sy=1, sz=1) {
      const object = new THREE.Mesh(geometry, material)
      object.position.set(x,y,z); object.scale.set(sx,sy,sz)
      object.castShadow = true; object.receiveShadow = true; parent.add(object)
      return object
    }
    function capsule(parent: THREE.Object3D, material: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, radius: number) {
      const direction = new THREE.Vector3().subVectors(b,a)
      const object = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.01,direction.length()-radius*2), 5, 10), material)
      object.position.copy(a).add(b).multiplyScalar(.5)
      object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize())
      object.castShadow = true; parent.add(object); return object
    }

    // A stylized, fully rotatable fashion figure with a clean white base outfit.
    const shoulder = gender === 'female' ? 0.43 : 0.49
    const waist = gender === 'female' ? 0.30 : 0.36
    const hip = gender === 'female' ? 0.43 : 0.39
    mesh(new THREE.SphereGeometry(.19,24,18), skin, root, 0, 2.13, 0, .82, 1.08, .82)
    mesh(new THREE.CylinderGeometry(.095,.11,.18,18), skin, root, 0, 1.94, 0)
    mesh(new THREE.CylinderGeometry(waist,shoulder,.77,24,1), white, root, 0, 1.48, 0, 1, 1, .63)
    mesh(new THREE.CylinderGeometry(waist*.98,hip,.25,24), white, root, 0, 1.0, 0, 1, 1, .67)
    // Shirt collar and front placket details.
    mesh(new THREE.BoxGeometry(.12,.36,.018), seam, root, 0, 1.48, .198)
    mesh(new THREE.CylinderGeometry(.10,.15,.10,4), white, root, 0, 1.86, .01, 1.15, 1, .8)

    // Sleeves, forearms and hands.
    for (const side of [-1,1]) {
      const s=side
      capsule(root,white,new THREE.Vector3(s*shoulder,1.78,0),new THREE.Vector3(s*.64,1.32,.01),.115)
      capsule(root,skin,new THREE.Vector3(s*.64,1.32,.01),new THREE.Vector3(s*.69,.91,.05),.075)
      mesh(new THREE.SphereGeometry(.075,14,12),skin,root,s*.69,.86,.05,.8,1.15,.7)
      // Trouser legs and sneakers.
      const outerX = gender === 'female' ? .205 : .19
      capsule(root,white,new THREE.Vector3(s*outerX,.96,0),new THREE.Vector3(s*.21,.48,0),.145)
      capsule(root,white,new THREE.Vector3(s*.21,.49,0),new THREE.Vector3(s*.21,.16,.015),.125)
      mesh(new THREE.BoxGeometry(.29,.13,.48),sole,root,s*.21,.09,.10,1,1,1)
      mesh(new THREE.BoxGeometry(.29,.045,.48),seam,root,s*.21,.045,.10)
      // Small eye details.
      mesh(new THREE.SphereGeometry(.018,8,8),dark,root,s*.065,2.15,.165)
    }
    // Hair silhouette and back volume.
    mesh(new THREE.SphereGeometry(.205,22,16,0,Math.PI*2,0,Math.PI*.57),hair,root,0,2.20,-.015,1.03,.78,1.02)
    if (gender === 'female') {
      mesh(new THREE.SphereGeometry(.105,16,14),hair,root,-.17,1.99,-.005,.78,1.9,.8)
      mesh(new THREE.SphereGeometry(.105,16,14),hair,root,.17,1.99,-.005,.78,1.9,.8)
    } else {
      mesh(new THREE.SphereGeometry(.18,16,12),hair,root,0,2.23,-.07,1.05,.28,.9)
    }

    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.8,48),new THREE.MeshStandardMaterial({color:'#211b18',roughness:1}))
    floor.rotation.x=-Math.PI/2; floor.position.y=-.005; floor.receiveShadow=true; scene.add(floor)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15,.008,8,80),new THREE.MeshBasicMaterial({color:'#6e4940'}))
    ring.rotation.x=Math.PI/2; ring.position.y=.012; scene.add(ring)

    let width=host.clientWidth, height=host.clientHeight
    function resize() {
      width=Math.max(1,host.clientWidth); height=Math.max(1,host.clientHeight)
      renderer.setSize(width,height,false); camera.aspect=width/height; camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize); observer.observe(host)
    let dragging=false, lastX=0, autoRotate=true, frame=0
    const down=(event:PointerEvent)=>{dragging=true;autoRotate=false;lastX=event.clientX;renderer.domElement.setPointerCapture(event.pointerId)}
    const move=(event:PointerEvent)=>{if(!dragging)return;root.rotation.y+=(event.clientX-lastX)*.012;lastX=event.clientX}
    const up=()=>{dragging=false}
    renderer.domElement.addEventListener('pointerdown',down)
    renderer.domElement.addEventListener('pointermove',move)
    renderer.domElement.addEventListener('pointerup',up)
    renderer.domElement.addEventListener('pointercancel',up)
    const animate=()=>{frame=requestAnimationFrame(animate);if(autoRotate)root.rotation.y+=.003;renderer.render(scene,camera)}
    animate()

    return ()=> {
      cancelAnimationFrame(frame); observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move)
      renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up)
      scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>material.dispose())}})
      renderer.dispose();renderer.domElement.parentElement?.removeChild(renderer.domElement)
    }
  },[gender])

  return <div className="mannequin-stage" ref={mountRef} aria-label={`${gender} 3D mannequin wearing a white shirt, white trousers and white sneakers`}><div className="mannequin-hint">DRAG TO ROTATE · 360° VIEW</div><div className="mannequin-look-label">THE BASE LOOK <span>ALL WHITE</span></div></div>
}
