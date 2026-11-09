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
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    camera.position.set(0, 1.62, 5.7)
    camera.lookAt(0, 1.28, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.touchAction = 'pan-y'
    host.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight(0xfff4e9, 0x30251f, 2.1))
    const key = new THREE.DirectionalLight(0xffffff, 3)
    key.position.set(-3, 6, 5)
    key.castShadow = true
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xd8c2b4, 1.15)
    fill.position.set(3, 2, 4)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0xd78e79, 1.5)
    rim.position.set(4, 3, -4)
    scene.add(rim)

    const stage = new THREE.Group()
    scene.add(stage)

    const skin = new THREE.MeshStandardMaterial({ color: '#c99578', roughness: 0.76 })
    const skinLight = new THREE.MeshStandardMaterial({ color: '#d5a88d', roughness: 0.72 })
    const outfit = new THREE.MeshStandardMaterial({ color: '#292522', roughness: 0.84 })
    const trousers = new THREE.MeshStandardMaterial({ color: '#34302e', roughness: 0.9 })
    const hair = new THREE.MeshStandardMaterial({ color: gender === 'male' ? '#29201b' : '#241b18', roughness: 0.9 })
    const eyes = new THREE.MeshStandardMaterial({ color: '#211a17', roughness: 0.45 })
    const white = new THREE.MeshStandardMaterial({ color: '#f1e8df', roughness: 0.55 })
    const mouth = new THREE.MeshStandardMaterial({ color: '#854e45', roughness: 0.8 })
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.3, 64),
      new THREE.MeshStandardMaterial({ color: '#28221e', roughness: 0.95 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    const addEllipsoid = (
      parent: THREE.Group,
      material: THREE.Material,
      position: [number, number, number],
      scale: [number, number, number],
      segments = 32,
    ) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, 24), material)
      mesh.position.set(...position)
      mesh.scale.set(...scale)
      mesh.castShadow = true
      mesh.receiveShadow = true
      parent.add(mesh)
      return mesh
    }

    const addLimb = (
      parent: THREE.Group,
      material: THREE.Material,
      from: THREE.Vector3,
      to: THREE.Vector3,
      radiusTop: number,
      radiusBottom: number,
    ) => {
      const direction = new THREE.Vector3().subVectors(to, from)
      const length = direction.length()
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 24, 1),
        material,
      )
      mesh.position.copy(from).add(to).multiplyScalar(0.5)
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
      mesh.castShadow = true
      mesh.receiveShadow = true
      parent.add(mesh)
      // Rounded ends make the limbs read as continuous anatomy rather than disconnected rods.
      addEllipsoid(parent, material, [from.x, from.y, from.z], [radiusBottom, radiusBottom, radiusBottom])
      addEllipsoid(parent, material, [to.x, to.y, to.z], [radiusTop, radiusTop, radiusTop])
      return mesh
    }

    const female = gender === 'female'
    const shoulder = female ? 0.365 : 0.43
    const waist = female ? 0.235 : 0.305
    const hip = female ? 0.375 : 0.325

    // Head, neck and face: eyes, brows, nose, ears, mouth and hair give the model recognisable human features.
    addEllipsoid(stage, skin, [0, 2.61, 0], [0.205, 0.265, 0.19])
    addEllipsoid(stage, skinLight, [0, 2.535, 0.145], [0.155, 0.155, 0.105])
    addEllipsoid(stage, skin, [0, 2.385, 0.005], [0.105, 0.16, 0.105])
    addEllipsoid(stage, hair, [0, 2.78, -0.015], [0.208, 0.115, 0.195])
    addEllipsoid(stage, hair, [0, 2.68, -0.145], [0.19, 0.16, 0.065])
    for (const side of [-1, 1]) {
      addEllipsoid(stage, skin, [side * 0.205, 2.61, 0], [0.045, 0.075, 0.04])
      addEllipsoid(stage, white, [side * 0.078, 2.635, 0.176], [0.043, 0.027, 0.018])
      addEllipsoid(stage, eyes, [side * 0.078, 2.635, 0.193], [0.018, 0.022, 0.009])
      addEllipsoid(stage, hair, [side * 0.078, 2.682, 0.172], [0.05, 0.012, 0.018])
    }
    addEllipsoid(stage, skinLight, [0, 2.59, 0.205], [0.027, 0.055, 0.035])
    addEllipsoid(stage, mouth, [0, 2.49, 0.196], [0.047, 0.012, 0.012])

    // Upper body and clothing follow a shoulder-to-waist silhouette.
    addEllipsoid(stage, skin, [0, 2.18, 0], [0.105, 0.12, 0.105])
    addEllipsoid(stage, outfit, [0, 1.82, 0], [shoulder, 0.43, 0.205])
    addEllipsoid(stage, outfit, [0, 1.47, 0], [waist * 1.12, 0.31, 0.17])
    addEllipsoid(stage, outfit, [0, 1.19, 0], [hip, 0.235, 0.19])

    // Arms hang naturally with a slight bend; hands include a palm and thumb.
    for (const side of [-1, 1]) {
      const shoulderPoint = new THREE.Vector3(side * shoulder * 0.88, 2.08, 0)
      const elbow = new THREE.Vector3(side * (shoulder + 0.17), 1.58, 0.015)
      const wrist = new THREE.Vector3(side * (shoulder + 0.23), 1.12, 0.045)
      addEllipsoid(stage, outfit, [shoulderPoint.x, shoulderPoint.y, 0], [0.125, 0.14, 0.13])
      addLimb(stage, skin, shoulderPoint, elbow, 0.088, 0.105)
      addEllipsoid(stage, skin, [elbow.x, elbow.y, elbow.z], [0.075, 0.08, 0.075])
      addLimb(stage, skin, elbow, wrist, 0.055, 0.078)
      addEllipsoid(stage, skinLight, [wrist.x, 1.015, wrist.z + 0.015], [0.072, 0.115, 0.042])
      addEllipsoid(stage, skin, [wrist.x + side * 0.065, 1.04, wrist.z + 0.035], [0.027, 0.075, 0.025])
    }

    // Legs have distinct thighs, knees, calves and feet instead of straight mannequin pegs.
    for (const side of [-1, 1]) {
      const hipPoint = new THREE.Vector3(side * (female ? 0.19 : 0.17), 1.08, 0)
      const knee = new THREE.Vector3(side * (female ? 0.205 : 0.19), 0.57, 0.015)
      const ankle = new THREE.Vector3(side * (female ? 0.21 : 0.19), 0.13, 0)
      addLimb(stage, trousers, hipPoint, knee, 0.115, 0.15)
      addEllipsoid(stage, trousers, [knee.x, knee.y, knee.z], [0.105, 0.105, 0.105])
      addLimb(stage, trousers, knee, ankle, 0.06, 0.095)
      addEllipsoid(stage, skin, [ankle.x, 0.075, 0.09], [0.085, 0.075, 0.17])
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
      skinLight.dispose()
      outfit.dispose()
      trousers.dispose()
      hair.dispose()
      eyes.dispose()
      white.dispose()
      mouth.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [gender])

  return (
    <div ref={mountRef} className="mannequin-stage" aria-label={`${gender} 3D human model`}>
      {status !== 'ready' && (
        <div className="mannequin-load-state" role="status">
          {status === 'loading' ? 'LOADING YOUR 3D MODEL…' : '3D VIEWER COULD NOT LOAD. PLEASE REFRESH.'}
        </div>
      )}
    </div>
  )
}
