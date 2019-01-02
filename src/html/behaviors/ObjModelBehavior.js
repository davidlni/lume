import 'element-behaviors'
import Class from 'lowclass'
import '../../../lib/three/global'
import 'three/examples/js/loaders/OBJLoader'
import 'three/examples/js/loaders/MTLLoader'
import Behavior from './Behavior'

const ObjModelBehavior = Class('ObjModelBehavior').extends(Behavior, ({Super, Public, Private}) => ({
    static: {
        props: {
            obj: String, // path to obj file
            mtl: String, // path to mtl file
        },
    },

    updated(oldProps, newProps, modifiedProps) {
        if (modifiedProps.obj || modifiedProps.mtl) {
            if (!this.obj) return
            Private(this).__cleanup()
            Private(this).__loadObj()
        }
    },

    connectedCallback() {
        Super(this).connectedCallback()
        this.model = null
        this.objLoader = new THREE.OBJLoader()
        this.mtlLoader = new THREE.MTLLoader(this.objLoader.manager)
        // Allow cross-origin images to be loaded.
        this.mtlLoader.crossOrigin = ''

        this.objLoader.manager.onLoad = () => {
            this.element._needsToBeRendered()
        }
    },

    disconnectedCallback() {
        Super(this).disconnectedCallback()
        Private(this).__cleanup()
    },

    private: {
        __cleanup() {
            const pub = Public(this)
            if (!pub.model) return
            disposeObjectTree(pub.model)
        },

        __loadObj() {
            const pub = Public(this)
            const { obj, mtl, mtlLoader, objLoader } = pub

            if (mtl) {
                mtlLoader.setTexturePath(mtl.substr(0, mtl.lastIndexOf('/') + 1))
                mtlLoader.load(mtl, materials => {
                    materials.preload()
                    objLoader.setMaterials(materials)
                    objLoader.load(obj, model => this.__setModel(model))
                })
            }
            else {
                objLoader.load(obj, model => {
                    let materialBehavior = pub.element.behaviors.get('basic-material')
                    if (!materialBehavior) materialBehavior = pub.element.behaviors.get('phong-material')
                    if (!materialBehavior) materialBehavior = pub.element.behaviors.get('standard-material')
                    if (!materialBehavior) materialBehavior = pub.element.behaviors.get('lambert-material')

                    if (materialBehavior) {
                        model.traverse(function (child) {
                            if ('material' in child) {
                                console.log( materialBehavior.getMeshComponent('material') )
                                child.material = materialBehavior.getMeshComponent('material')
                            }
                        })
                    }
                    else {
                        // if no material, make a default one with random color
                        setRandomColorPhongMaterial(model)
                    }

                    this.__setModel(model)
                })
            }
        },

        __setModel(model) {
            const pub = Public(this)
            pub.element.three.add(pub.model = model)
            pub.element.emit('model-loaded', {format: 'obj', model: model})
            pub.element._needsToBeRendered()
        },
    },

}))

function setColorPhongMaterial(obj, color, dispose, traverse = true) {
    const material = new THREE.MeshPhongMaterial
    material.color = new THREE.Color( color )

    if (traverse) obj.traverse(node => applyMaterial(node, material))
    else applyMaterial(obj, material)
}

function applyMaterial(obj, material, dispose = true) {
    if (!isRenderItem(obj)) return
    if (dispose && obj.material) disposeMaterial(obj)
    obj.material = material
}

function setRandomColorPhongMaterial(obj, dispose, traverse) {
    const randomColor = 0xffffff/3 * Math.random() + 0xffffff/3
    setColorPhongMaterial( obj, randomColor, dispose, traverse )
}

function isRenderItem(obj) {
  return 'geometry' in obj && 'material' in obj
}

function disposeMaterial(obj) {
  if (!isRenderItem(obj)) return

  // because obj.material can be a material or array of materials
  const materials = [].concat(obj.material)

  for (const material of materials) {
    material.dispose()
  }
}

function disposeObject(
  obj,
  removeFromParent = true,
  destroyGeometry = true,
  destroyMaterial = true
) {
  if (isRenderItem(obj)) {
    if (destroyGeometry) obj.geometry.dispose()
    if (destroyMaterial) disposeMaterial(obj)
  }

  removeFromParent && Promise.resolve().then(() => {
    // if we remove children in the same tick then we can't continue traversing,
    // so we defer to the next microtask
    obj.parent && obj.parent.remove(obj)
  })
}

function disposeObjectTree(obj, disposeOptions = {}) {
  obj.traverse(node => {
    disposeObject(
      node,
      disposeOptions.removeFromParent,
      disposeOptions.destroyGeometry,
      disposeOptions.destroyMaterial
    )
  })
}

elementBehaviors.define('obj-model', ObjModelBehavior)

export default ObjModelBehavior
