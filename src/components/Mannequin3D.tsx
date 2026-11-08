import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

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

    let disposed = false
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
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.3, 64),
      new THREE.MeshStandardMaterial({ color: '#28221e', roughness: 0.95 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0
    floor.receiveShadow = true
    scene.add(floor)

    const showError = (message: string) => {
      console.error(message)
      if (!disposed) setStatus('error')
    }

    const loader = new GLTFLoader()
    loader.load(
      `/models/closet_${gender}_mannequin.glb`,
      (gltf) => {
        if (disposed) return
        const model = gltf.scene
        const bounds = new THREE.Box3().setFromObject(model)
        if (bounds.isEmpty()) {
          showError('The mannequin GLB contains no visible geometry.')
          return
        }
        const size = bounds.getSize(new THREE.Vector3())
        const center = bounds.getCenter(new THREE.Vector3())
        const fitScale = 2.75 / Math.max(size.y, 0.01)
        model.scale.setScalar(fitScale)
        model.position.set(-center.x * fitScale, -bounds.min.y * fitScale + 0.04, -center.z * fitScale)
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true
            object.receiveShadow = true
            if (Array.isArray(object.material)) object.material.forEach((m) => { m.needsUpdate = true })
            else object.material.needsUpdate = true
          }
        })
        stage.add(model)
        setStatus('ready')
      },
      undefined,
      (error) => showError(`Could not load /models/closet_${gender}_mannequin.glb: ${String(error)}`),
    )

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
      disposed = true
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
