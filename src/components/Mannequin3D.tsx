import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export type Outfit = { top: string | null; bottom: string | null; shoes: string | null }
export type MannequinView = 'front' | 'back' | 'spin'

type Props = {
  gender: 'male' | 'female'
  outfit?: Outfit
  view?: MannequinView
  onInteract?: () => void
}

const BASE = { top: '#e9e7e2', bottom: '#d9d7d1', shoes: '#f3f3f1' }

export default function Mannequin3D({ gender, outfit, view = 'spin', onInteract }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const targets = useRef({ top: new THREE.Color(BASE.top), bottom: new THREE.Color(BASE.bottom), shoes: new THREE.Color(BASE.shoes) })
  const viewRef = useRef<MannequinView>(view)
  const interact = useRef(onInteract)

  useEffect(() => { interact.current = onInteract }, [onInteract])
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => {
    targets.current.top.set(outfit?.top ?? BASE.top)
    targets.current.bottom.set(outfit?.bottom ?? BASE.bottom)
    targets.current.shoes.set(outfit?.shoes ?? BASE.shoes)
  }, [outfit?.top, outfit?.bottom, outfit?.shoes])

  useEffect(() => {
    const host = mountRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    } catch (error) {
      console.error('WebGL is unavailable for the mannequin viewer', error)
      setStatus('error')
      return
    }

    setStatus('loading')
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#1a1d22')
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    camera.position.set(0, 1.55, 5.2)
    camera.lookAt(0, 1.0, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    host.appendChild(renderer.domElement)

    // Neutral lighting so clothing colors stay true to the photos.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a404a, 2.0))
    const key = new THREE.DirectionalLight(0xffffff, 2.6)
    key.position.set(-3, 6, 5)
    key.castShadow = true
    scene.add(key)
    const back = new THREE.DirectionalLight(0xffffff, 1.4)
    back.position.set(3, 4, -5)
    scene.add(back)

    const stage = new THREE.Group()
    scene.add(stage)

    const skin = new THREE.MeshStandardMaterial({ color: '#c9a58e', roughness: 0.72, metalness: 0.02 })
    const joint = new THREE.MeshStandardMaterial({ color: '#b9917b', roughness: 0.76 })
    const mats = {
      top: new THREE.MeshStandardMaterial({ color: targets.current.top.clone(), roughness: 0.88 }),
      bottom: new THREE.MeshStandardMaterial({ color: targets.current.bottom.clone(), roughness: 0.9 }),
      shoes: new THREE.MeshStandardMaterial({ color: targets.current.shoes.clone(), roughness: 0.6 }),
    }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.3, 64), new THREE.MeshStandardMaterial({ color: '#262b32', roughness: 0.95 }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    const ellipsoid = (material: THREE.Material, position: [number, number, number], scale: [number, number, number]) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), material)
      mesh.position.set(...position)
      mesh.scale.set(...scale)
      mesh.castShadow = true
      mesh.receiveShadow = true
      stage.add(mesh)
    }
    const limb = (material: THREE.Material, from: THREE.Vector3, to: THREE.Vector3, radiusTop: number, radiusBottom: number) => {
      const direction = new THREE.Vector3().subVectors(to, from)
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, direction.length(), 24, 1), material)
      mesh.position.copy(from).add(to).multiplyScalar(0.5)
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
      mesh.castShadow = true
      mesh.receiveShadow = true
      stage.add(mesh)
    }

    // A clean display mannequin built locally. Top, bottom and shoes have their own materials
    // so any closet color can be shown without loading a model file.
    const female = gender === 'female'
    const shoulder = female ? 0.36 : 0.43
    const waist = female ? 0.235 : 0.31
    const hip = female ? 0.36 : 0.32
    ellipsoid(skin, [0, 2.56, 0], [0.19, 0.25, 0.17])
    limb(skin, new THREE.Vector3(0, 2.37, 0), new THREE.Vector3(0, 2.19, 0), 0.085, 0.09)
    ellipsoid(mats.top, [0, 1.82, 0], [shoulder, 0.47, 0.205])
    ellipsoid(mats.top, [0, 1.43, 0], [waist + 0.02, 0.34, 0.18])
    ellipsoid(mats.bottom, [0, 1.16, 0], [hip, 0.24, 0.19])

    for (const s of [-1, 1]) {
      const shoulderPoint = new THREE.Vector3(s * shoulder * 0.88, 2.08, 0)
      const elbow = new THREE.Vector3(s * (shoulder + 0.17), 1.53, 0.015)
      const wrist = new THREE.Vector3(s * (shoulder + 0.23), 1.08, 0.04)
      ellipsoid(mats.top, [shoulderPoint.x, shoulderPoint.y, 0], [0.13, 0.14, 0.13])
      limb(mats.top, shoulderPoint, elbow, 0.115, 0.095)
      ellipsoid(joint, [elbow.x, elbow.y, elbow.z], [0.085, 0.085, 0.085])
      limb(skin, elbow, wrist, 0.078, 0.055)
      ellipsoid(skin, [wrist.x, 0.99, wrist.z], [0.075, 0.13, 0.045])

      const hipPoint = new THREE.Vector3(s * (female ? 0.19 : 0.17), 1.06, 0)
      const knee = new THREE.Vector3(s * (female ? 0.205 : 0.19), 0.57, 0.015)
      const ankle = new THREE.Vector3(s * (female ? 0.21 : 0.19), 0.14, 0)
      limb(mats.bottom, hipPoint, knee, 0.15, 0.108)
      ellipsoid(mats.bottom, [knee.x, knee.y, knee.z], [0.108, 0.112, 0.108])
      limb(mats.bottom, knee, ankle, 0.098, 0.07)
      ellipsoid(mats.shoes, [ankle.x, 0.075, 0.085], [0.095, 0.08, 0.19])
    }

    setStatus('ready')
    let dragging = false
    let previousX = 0
    let rotationVelocity = 0
    const onPointerDown = (event: PointerEvent) => {
      dragging = true
      previousX = event.clientX
      renderer.domElement.setPointerCapture?.(event.pointerId)
      if (viewRef.current !== 'spin') interact.current?.()
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return
      const delta = event.clientX - previousX
      previousX = event.clientX
      rotationVelocity = delta * 0.008
      stage.rotation.y += rotationVelocity
    }
    const onPointerUp = () => { dragging = false }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)

    const resize = () => {
      const width = Math.max(host.clientWidth, 1)
      const height = Math.max(host.clientHeight, 1)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    const TWO_PI = Math.PI * 2
    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      mats.top.color.lerp(targets.current.top, 0.18)
      mats.bottom.color.lerp(targets.current.bottom, 0.18)
      mats.shoes.color.lerp(targets.current.shoes, 0.18)
      if (!dragging) {
        const mode = viewRef.current
        if (mode === 'spin') {
          stage.rotation.y += 0.003 + rotationVelocity
          rotationVelocity *= 0.94
        } else {
          const target = mode === 'back' ? Math.PI : 0
          const diff = ((target - stage.rotation.y + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI
          stage.rotation.y += diff * 0.14
        }
      }
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)
      stage.traverse(object => {
        if (object instanceof THREE.Mesh) object.geometry.dispose()
      })
      floor.geometry.dispose()
      ;[skin, joint, mats.top, mats.bottom, mats.shoes, floor.material as THREE.Material].forEach(material => material.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [gender])

  return (
    <div ref={mountRef} className="mannequin-stage" aria-label={`${gender} 3D mannequin`}>
      {status !== 'ready' && (
        <div className="mannequin-load-state" role="status">
          {status === 'loading' ? 'Loading your mannequin…' : 'The 3D viewer could not load. Refresh to try again.'}
        </div>
      )}
    </div>
  )
}
