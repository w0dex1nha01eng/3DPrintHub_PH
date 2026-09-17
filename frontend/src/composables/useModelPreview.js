import { onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import * as THREE from 'three'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { site } from '../config/site.js'
import { inspectModelData } from '../utils/inspectModel.js'

export function useModelPreview(container, props) {
  const state = reactive({ phase: 'idle', message: '上传文件后预览模型。', dimensions: null, triangles: 0, rotating: false, wireframe: false })
  let renderer, scene, camera, controls, model, observer, grid, floor
  let version = 0
  let disposed = false
  let radius = 70
  const loader = new STLLoader()

  function clearModel() {
    if (!model) return
    scene.remove(model)
    model.geometry.dispose()
    model.material.dispose()
    model = null
  }

  function fit() {
    if (!camera || !controls) return
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2)
    const limitingFov = Math.min(halfFov, Math.atan(Math.tan(halfFov) * camera.aspect))
    const distance = radius / Math.sin(limitingFov) * 1.2
    camera.position.copy(new THREE.Vector3(1.1, 0.75, 1.5).normalize().multiplyScalar(distance))
    camera.near = Math.max(radius / 1000, 0.001)
    camera.far = distance * 20
    camera.updateProjectionMatrix()
    controls.target.set(0, 0, 0)
    controls.minDistance = radius * 0.8
    controls.maxDistance = distance * 4
    controls.update()
  }

  async function load() {
    if (!renderer) return
    const ticket = ++version
    state.phase = 'loading'
    state.dimensions = null
    state.triangles = 0
    clearModel()
    if (!props.file) {
      state.phase = 'idle'
      state.message = '上传文件后预览模型。'
      return
    }
    if (props.file?.size > site.maxPreviewSize) {
      state.phase = 'unavailable'
      state.message = '模型超过 20 MB，已跳过预览。仍可正常提交打印。'
      return
    }
    let geometry
    try {
      let buffer
      if (/\.3mf$/i.test(props.file?.name || '')) {
        const result = await inspectModelData(props.file)
        if (disposed || ticket !== version) return
        if (result.reviewRequired) {
          state.phase = 'unavailable'
          state.message = '该 3MF 需要人工确认，暂无法生成预览。'
          return
        }
        if (!result.positions) {
          state.phase = 'unavailable'
          state.message = '装配三角面数量较多，已跳过预览。模型仍须通过尺寸检查。'
          state.dimensions = result.dimensions.map((value) => value.toFixed(1))
          state.triangles = result.triangles
          return
        }
        geometry = new THREE.BufferGeometry()
        // 这里拷一份，免得旋转时把缓存也改了。
        geometry.setAttribute('position', new THREE.BufferAttribute(result.positions.slice(), 3))
      } else buffer = await props.file.arrayBuffer()
      if (disposed || ticket !== version) return
      geometry ||= loader.parse(buffer)
      const position = geometry.getAttribute('position')
      if (!position || position.count < 3 || position.count % 3) throw new Error('empty mesh')
      for (const value of position.array) if (!Number.isFinite(value)) throw new Error('invalid coordinate')
      geometry.computeBoundingBox()
      const size = geometry.boundingBox.getSize(new THREE.Vector3())
      if (Math.max(size.x, size.y, size.z) <= 0) throw new Error('empty bounds')
      state.dimensions = [size.x, size.y, size.z].map((value) => value.toFixed(1))
      state.triangles = position.count / 3
      geometry.rotateX(-Math.PI / 2)
      geometry.center()
      geometry.computeVertexNormals()
      geometry.computeBoundingSphere()
      radius = geometry.boundingSphere.radius
      model = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: props.color || '#85b9a0', roughness: 0.62, metalness: 0.08, wireframe: state.wireframe }))
      model.castShadow = true
      model.receiveShadow = true
      scene.add(model)
      geometry = null
      model.geometry.computeBoundingBox()
      const bottom = model.geometry.boundingBox.min.y - radius * 0.03
      grid.position.y = bottom
      grid.scale.setScalar(radius / 65)
      floor.position.y = bottom - 0.01
      floor.scale.setScalar(radius / 65)
      fit()
      state.phase = 'ready'
    } catch {
      geometry?.dispose()
      if (disposed || ticket !== version) return
      state.phase = 'error'
      state.message = '无法解析此模型，请确认 STL / 3MF 文件完整并重新导出。'
    }
  }

  onMounted(() => {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFShadowMap
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.18
      renderer.domElement.setAttribute('aria-label', '模型三维预览')
      renderer.domElement.setAttribute('role', 'img')
      container.value.appendChild(renderer.domElement)
      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10000)
      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.enablePan = false
      controls.enableZoom = false
      controls.autoRotateSpeed = 0.65
      scene.add(new THREE.HemisphereLight('#ffffff', '#c0d0c5', 2.6))
      const key = new THREE.DirectionalLight('#ffffff', 3.2)
      key.position.set(100, 150, 150)
      key.castShadow = true
      key.shadow.mapSize.set(1024, 1024)
      Object.assign(key.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150 })
      key.shadow.bias = -0.001
      scene.add(key)
      const fill = new THREE.DirectionalLight('#dcecf0', 1)
      fill.position.set(-100, 50, -50)
      scene.add(fill)
      grid = new THREE.GridHelper(400, 40, '#cfd9d2', '#e0e6e1')
      grid.material.transparent = true
      grid.material.opacity = 0.6
      scene.add(grid)
      floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ opacity: 0.12 }))
      floor.rotation.x = -Math.PI / 2
      floor.receiveShadow = true
      scene.add(floor)
      observer = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect
        if (!width || !height) return
        renderer.setSize(width, height)
        camera.aspect = width / height
        fit()
      })
      observer.observe(container.value)
      renderer.setAnimationLoop(() => {
        if (document.hidden) return
        controls.autoRotate = state.rotating
        controls.update()
        renderer.render(scene, camera)
      })
      load()
    } catch {
      state.phase = 'unavailable'
      state.message = '此设备暂不支持三维预览，仍可选择文件并提交打印。'
    }
  })

  watch(() => props.file, load)
  watch(() => props.color, (color) => { if (model) model.material.color.set(color || '#85b9a0') })

  onBeforeUnmount(() => {
    disposed = true
    version++
    observer?.disconnect()
    controls?.dispose()
    renderer?.setAnimationLoop(null)
    clearModel()
    scene?.traverse((object) => {
      object.geometry?.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => material?.dispose())
      object.shadow?.map?.dispose()
    })
    renderer?.dispose()
    renderer?.domElement.remove()
  })

  return {
    state,
    fit,
    zoom(factor) { if (camera) camera.position.multiplyScalar(factor) },
    toggleRotate() { state.rotating = !state.rotating },
    toggleWireframe() { state.wireframe = !state.wireframe; if (model) model.material.wireframe = state.wireframe },
  }
}
