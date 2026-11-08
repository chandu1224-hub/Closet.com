import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

type Props = { gender: 'male' | 'female' }

export default function Mannequin3D({ gender }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

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
    scene.background = new THREE.Color('#171412')
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

    scene.add(new THREE.HemisphereLight(0xfff4e9, 0x30251f, 2.2))
    const key = new THREE.DirectionalLight(0xffffff, 3)
    key.position.set(-3, 6, 5)
    key.castShadow = true
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xd78e79, 1.4)
    rim.position.set(4, 3, -4)
    scene.add(rim)

    const stage = new THREE.Group()
    scene.add(stage)

    const skin = new THREE.MeshStandardMaterial({ color: '#c9a58e', roughness: 0.72, metalness: 0.02 })
    const body = new THREE.MeshStandardMaterial({ color: '#292522', roughness: 0.82 })
    const joints = new THREE.MeshStandardMaterial({ color: '#b9917b', roughness: 0.76 })
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.3, 64),
      new THREE.MeshStandardMaterial({ color: '#28221e', roughness: 0.95 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0
    floor.receiveShadow = true
    scene.add(floor)

    const addEllipsoid = (parent: THREE.Group, material: THREE.Material, position: [number, number, number], scale: [number, number, number]) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), material)
      mesh.position.set(...position)
      mesh.scale.set(...scale)
      mesh.castShadow = true
      mesh.receiveShadow = true
      parent.add(mesh)
      return mesh
    }
    const addLimb = (parent: THREE.Group, material: THREE.Material, from: THREE.Vector3, to: THREE.Vector3, radiusTop: number, radiusBottom: number) => {
      const direction = new THREE.Vector3().subVectors(to, from)
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, direction.length(), 24, 1), material)
      mesh.position.copy(from).add(to).multiplyScalar(0.5)
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
      mesh.castShadow = true
      mesh.receiveShadow = true
      parent.add(mesh)
      return mesh
    }

    // A clean, stylized display mannequin built locally: no remote model file required.
    const female = gender === 'female'
    const shoulder = female ? 0.36 : 0.43
    const waist = female ? 0.235 : 0.31
    const hip = female ? 0.36 : 0.32
    addEllipsoid(stage, skin, [0, 2.56, 0], [0.19, 0.25, 0.17])
    addLimb(stage, skin, new THREE.Vector3(0, 2.37, 0), new THREE.Vector3(0, 2.19, 0), 0.085, 0.09)
    addEllipsoid(stage, body, [0, 1.82, 0], [shoulder, 0.47, 0.205])
    addEllipsoid(stage, body, [0, 1.43, 0], [waist, 0.32, 0.17])
    addEllipsoid(stage, body, [0, 1.16, 0], [hip, 0.24, 0.19])

    for (const side of [-1, 1]) {
      const s = side
      const shoulderPoint = new THREE.Vector3(s * shoulder * 0.88, 2.08, 0)
      const elbow = new THREE.Vector3(s * (shoulder + 0.17), 1.53, 0.015)
      const wrist = new THREE.Vector3(s * (shoulder + 0.23), 1.08, 0.04)
      addEllipsoid(stage, joints, [shoulderPoint.x, shoulderPoint.y, 0], [0.12, 0.13, 0.12])
      addLimb(stage, skin, shoulderPoint, elbow, 0.105, 0.085)
      addEllipsoid(stage, joints, [elbow.x, elbow.y, elbow.z], [0.085, 0.085, 0.085])
      addLimb(stage, skin, elbow, wrist, 0.078, 0.055)
      addEllipsoid(stage, skin, [wrist.x, 0.99, wrist.z], [0.075, 0.13, 0.045])

      const hipPoint = new THREE.Vector3(s * (female ? 0.19 : 0.17), 1.06, 0)
      const knee = new THREE.Vector3(s * (female ? 0.205 : 0.19), 0.57, 0.015)
      const ankle = new THREE.Vector3(s * (female ? 0.21 : 0.19), 0.12, 0)
      addLimb(stage, body, hipPoint, knee, 0.15, 0.105)
      addEllipsoid(stage, joints, [knee.x, knee.y, knee.z], [0.105, 0.11, 0.105])
      addLimb(stage, body, knee, ankle, 0.095, 0.055)
      addEllipsoid(stage, body, [ankle.x, 0.075, 0.085], [0.09, 0.075, 0.18])
    }

    setStatus('ready')
    let dragging = false
    let previousX = 0
    let rotationVelocity = 0
    const onPointerDown = (event: PointerEvent) => {
      dragging = true
      previousX = event.clientX
      renderer.domElement.setPointerCapture?.(event.pointerId)
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

    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      if (!dragging) {
        stage.rotation.y += 0.003 + rotationVelocity
        rotationVelocity *= 0.94
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
      stage.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => material.dispose())
        }
      })
      floor.geometry.dispose()
      ;(floor.material as THREE.Material).dispose()
      skin.dispose()
      body.dispose()
      joints.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [gender])

  return (
    <div ref={mountRef} className="mannequin-stage" aria-label={`${gender} 3D mannequin`}>
      {status !== 'ready' && (
        <div className="mannequin-load-state" role="status">
          {status === 'loading' ? 'LOADING YOUR 3D MANNEQUIN…' : '3D VIEWER COULD NOT LOAD. PLEASE REFRESH.'}
        </div>
      )}
    </div>
  )
}
